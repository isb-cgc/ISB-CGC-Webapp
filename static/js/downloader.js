/**
 *
 * Copyright 2025, Institute for Systems Biology
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// by @pieper 6/25/25
require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.7.1.min',
        base: 'base'
    }
});

require([
    'base', 'jquery'
], function (base, $) {

    class DownloadRequest {
        region = "us-east-1";

        constructor(request) {
            this.study_id = request['study_id'];
            this.collection_id = request['collection_id'];
            this.series_id = request['series_id'];
            this.modality = request['modality'];
            this.patient_id = request['patient_id'];
            this.bucket = request['bucket'];
            this.crdc_series_id = request['crdc_series_id'];
            this.directory = request['directory'];
        }

        async getAllS3ObjectKeys() {
            const allKeys = [];
            let isTruncated = true;
            let continuationToken = null;
            while (isTruncated) {
                let url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/?list-type=2`;
                if (this.crdc_series_id) {
                    url += `&prefix=${encodeURIComponent(this.crdc_series_id)}`;
                }
                if (continuationToken) {
                    url += `&continuation-token=${encodeURIComponent(continuationToken)}`;
                }
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
                    }
                    const xmlText = await response.text();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
                    const errorCode = xmlDoc.getElementsByTagName('Code')[0]?.textContent;
                    if (errorCode) {
                        const errorMessage = xmlDoc.getElementsByTagName('Message')[0]?.textContent;
                        throw new Error(`S3 API Error: ${errorCode} - ${errorMessage}`);
                    }
                    const keyElements = xmlDoc.getElementsByTagName('Key');
                    const keysOnPage = Array.from(keyElements).map(el => el.textContent);
                    allKeys.push(...keysOnPage);
                    isTruncated = xmlDoc.getElementsByTagName('IsTruncated')[0]?.textContent === 'true';
                    if (isTruncated) {
                        continuationToken = xmlDoc.getElementsByTagName('NextContinuationToken')[0]?.textContent;
                    } else {
                        continuationToken = null;
                    }
                } catch (error) {
                    console.error("Failed to fetch S3 data:", error);
                    throw error; // Re-throw the error to be handled by the caller
                }
            }
            return allKeys;
        }

        async loadAllKeys() {
            const s3_urls = [];
            await this.getAllS3ObjectKeys().then(keys => {
                keys.forEach((key) => {
                    if (key !== "") {
                        const keys = key.split("/");
                        const instance = keys[keys.length - 1];
                        s3_urls.push({
                            'url': `https://${this.bucket}.s3.us-east-1.amazonaws.com/${key}`,
                            'study': this.study_id,
                            'collection': this.collection_id,
                            'series': this.series_id,
                            'modality': this.modality,
                            'instance': instance,
                            'patient': this.patient_id,
                            'directory': this.directory
                        });
                    }
                });
            });
            return s3_urls;
        }

    }

    class DownloadQueueManager {
        WORKING_QUEUE_LIMIT = 2000;
        HOPPER_LIMIT = 500;

        hopper = [];
        working_queue = [];

        get pending() {
            return this.working_queue.length + this.hopper.length;
        }

        async _update_queue() {
            if(this.working_queue.length < this.WORKING_QUEUE_LIMIT && this.hopper.length > 0) {
                let request = this.hopper.pop();
                await request.loadAllKeys().then(keys => {
                    this.working_queue.push(...keys);
                });
            }
        }

        load(request) {
            let request_success = false;
            if(this.hopper.length < this.HOPPER_LIMIT) {
                this.hopper.push(new DownloadRequest(request));
                request_success = true;
            }
            return request_success;
        }

        isEmpty() {
            return (this.working_queue.length <= 0 && this.hopper.length <= 0);
        }

        async get_download_item() {
            await this._update_queue();
            if(this.working_queue.length > 0) {
                return this.working_queue.pop();
            }
            return null;
        }

        emptyQueues() {
            this.working_queue.slice(0,this.working_queue.length);
            this.hopper.slice(0,this.hopper.length);
        }
    }

    function workerOnMessage(event) {
        let thisWorker = event.target;
        let true_error = event.data.message === 'error' && event.data.error.name !== "AbortError";
        let cancellation = event.data.message === 'error' && (downloader_manager.pending_cancellation || event.data.error.name === "AbortError");
        if (true_error) {
            console.error(`Worker Error: ${JSON.stringify(event)}`);
            downloader_manager.statusMessage(`Encountered an error while downloading these files.`, 'error', null, true, false);
        }
        if (event.data.message === 'done' || cancellation) {
            let msg = `Download status: ${downloader_manager.in_progress} files in progress, ${downloader_manager.queues.pending} in queue...`;
            if (downloader_manager.queues.isEmpty()) {
                // This means the remaining downloads are all in-progress, or we cancelled
                msg = cancellation ? "Cleaning up cancelled downloads..." : `Download status: ${downloader_manager.in_progress} file(s) in progress...`;
            }
            downloader_manager.progressUpdate(msg);
        }
        if (downloader_manager.queues.isEmpty() || (thisWorker.downloadCount > downloader_manager.workerDownloadThreshold) || downloader_manager.pending_cancellation) {
            downloader_manager.finalizeWorker(thisWorker);
        } else {
            thisWorker.downloadCount += 1;
            downloader_manager.availableWorkers.push(thisWorker);
        }
        downloader_manager.triggerWorkerDownloads();
    }

    function workerOnError(event) {
        let thisWorker = event.target
        console.error('[Main] Error in worker:', event.message || "No message given", event);
        downloader_manager.statusMessage(`[Worker] Error in worker: ${event.message}`, 'error', null, true, false);
        downloader_manager.finalizeWorker(thisWorker);
    }

    class DownloadManager {
        // Text blobs
        workerCode = `
            const abort_controller = new AbortController();
            let pending_abort = false;
            let working = false;
            function abortFetch(msg) {
                abort_controller.abort(msg || "Fetch aborted.");
                pending_abort = true;
            };
            
            async function createNestedDirectories(topLevelDirectoryHandle, path) {
                const pathSegments = path.split('/').filter((segment) => segment !== '');
                let currentDirectoryHandle = topLevelDirectoryHandle;
                for (const segment of pathSegments) {
                    try {
                        // Attempt to get the directory handle without creating it
                        const entry = await currentDirectoryHandle.getDirectoryHandle(segment, {
                            create: false
                        })
                        currentDirectoryHandle = entry;
                    } catch (error) {
                        // If the error is specifically about the directory not existing, create it
                        if (error.name === 'NotFoundError') {
                            const entry = await currentDirectoryHandle.getDirectoryHandle(segment, {
                                create: true
                            })
                            currentDirectoryHandle = entry;
                        } else {
                            // TODO: Handle other potential errors (e.g., name conflicts)
                            return false; // Indicate failure
                        }
                    }
                }
                // Return the last directory handle
                return currentDirectoryHandle;
            }
            
            self.onmessage = async function (event) {
                if(event.data['abort'] && working) {
                    abortFetch(event.data['reason']);
                    return;
                }
                working = true;
                const s3_url = event.data['url'];
                const metadata = event.data['metadata'];
                const modality = metadata['modality'];
                const patientID = metadata['patient'];
                const collection_id = metadata['collection'];
                const studyInstanceUID = metadata['study'];
                const seriesInstanceUID = metadata['series'];
                const fileName = metadata['instance'];
                try {
                    const directoryHandle = event.data['directoryHandle'];
                    response = await fetch(s3_url, {
                        signal: abort_controller.signal
                    });
                    if (!response.ok) {
                        if(pending_abort) {
                            console.log('User aborted downloads');
                        } else {
                            console.error('[Worker] Failed to fetch URL: '+s3_url, response.statusText);
                            self.postMessage({message: "error", error: "Failed to fetch URL"});
                        }
                        return;
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const seriesDirectory = modality + "_" + seriesInstanceUID;
                    const filePath = [collection_id, patientID, studyInstanceUID, seriesDirectory].join("/");
                    const blob = new Blob([arrayBuffer], {type: 'application/dicom'});
                    const file = new File([blob], fileName, {type: 'application/dicom'});
                    const subDirectoryHandle = await createNestedDirectories(directoryHandle, filePath);
                    const fileHandle = await subDirectoryHandle.getFileHandle(fileName, {create: true});
                    const writable = await fileHandle.createWritable();
                    await writable.write(arrayBuffer);
                    await writable.close();
                    self.postMessage({message: "done", path: s3_url, localFilePath: filePath});
                    working = false;
                } catch (error) {
                    let msg = error.name || "Unnamed Error" + " when attempting to fetch URL " + s3_url;
                    if(error.name === "AbortError" || (error.name === undefined && pending_abort)) {
                        msg = "Fetch was aborted. The user may have cancelled their downloads.";
                        working && console.log(msg);
                    } else {
                        console.error(msg);
                        console.error(error);
                    }
                    self.postMessage({message: 'error', path: s3_url, error: error, 'text': msg});
                    working = false;
                }
            }    
        `;
        cancel_button = `
            <button type="button" class="cancel-download btn btn-default">Cancel</button>
        `;
        close_button = `
            <button type="button" class="close-message-window close-msg-box btn btn-primary">Close</button>
        `;

        // Status
        pending_cancellation = false;

        // Workers
        availableWorkers = [];
        downloadWorkers = [];
        workerDownloadThreshold = 100;
        workerCodeBlob = null;
        workerObjectURL = null;
        workerLimit = navigator.hardwareConcurrency;

        constructor() {
            this.queues = new DownloadQueueManager();
            this.workerCodeBlob = new Blob([this.workerCode], {type: 'application/javascript'});
        }

        get in_progress() {
            return this.downloadWorkers.length - this.availableWorkers.length;
        }

        // Replaces the current floating message contents with a new message, including a new icon if provided
        statusMessage(message, type, icon, withClose, withCancel) {
            let buttons = [];
            withCancel && buttons.push(this.cancel_button);
            withClose && buttons.push(this.close_button);
            base.showFloatingMessage(type, message, true, null, icon, buttons);
        }

        // Updates the current floating message contents and display class
        progressUpdate(message, type) {
            base.showFloatingMessage(type, message, false);
        }

        finalizeWorker(worker) {
            worker.terminate();
            this.downloadWorkers = this.downloadWorkers.filter(w => w !== worker);
        }

        allocateWorker() {
            let downloadWorker = new Worker(this.workerObjectURL);
            downloadWorker.onmessage = workerOnMessage;
            downloadWorker.onerror = workerOnError;
            downloadWorker.downloadCount = 0;
            this.downloadWorkers.push(downloadWorker);
            return downloadWorker
        }

        async triggerWorkerDownloads() {
            // One way or another, there's nothing left to download
            if (this.queues.isEmpty() && this.downloadWorkers.length <= 0) {
                // cleanup our worker object URL for now
                if (this.workerObjectURL) {
                    URL.revokeObjectURL(this.workerObjectURL);
                    this.workerObjectURL = null;
                }
                let msg = this.pending_cancellation ? 'Download cancelled.' : `Download complete.`;
                let type = this.pending_cancellation ? 'warning' : 'info';
                this.statusMessage(msg, type, null, true, false);
                this.pending_cancellation = false;
            } else {
                if (!this.workerObjectURL) {
                    this.workerObjectURL = URL.createObjectURL(this.workerCodeBlob);
                }
                console.log("Queues:",this.queues.isEmpty());
                while (!this.queues.isEmpty()) {
                    let targetWorker = null;
                    if (this.availableWorkers.length > 0) {
                        targetWorker = this.availableWorkers.pop();
                    } else {
                        if (this.downloadWorkers.length <= this.workerLimit) {
                            targetWorker = this.allocateWorker();
                        } else {
                            break; // all workers busy and we can't add more
                        }
                    }
                    if(targetWorker) {
                        let item_to_download = await this.queues.get_download_item();
                        targetWorker.postMessage({
                            'url': item_to_download['url'],
                            'metadata': item_to_download,
                            'directoryHandle': item_to_download['directory']
                        });
                    } else {
                        break;
                    }
                }
            }
        }

        addRequest(request) {
            this.queues.load(request);
        }

        cancel() {
            this.pending_cancellation = true;
            $('.cancel-download').hide();
            $('.close-message-window').show();
            this.queues.emptyQueues();
            this.downloadWorkers.forEach(worker => {
                worker.postMessage({'abort': true, 'reason': 'User cancelled download.'});
            });
        }

        beginDownloads() {
            if(!this.queues.isEmpty()) {
                this.triggerWorkerDownloads();
            }
            $('.cancel-download').show();
            $('.close-message-window').hide();
            this.statusMessage("Download underway.", 'message', '<i class="fa-solid fa-atom fa-spin"></i>', false, true);
        }
    }

    async function getDirectory() {
        let directoryHandle = await window.showDirectoryPicker({
            id: 'idc-downloads',
            startIn: 'downloads',
            mode: 'readwrite',
        });
        return directoryHandle;
    }

    let downloader_manager = new DownloadManager();

    $('.container-fluid').on('click', '.cancel-download', function () {
        downloader_manager.cancel();
    });

    $('.container-fluid').on('click', '.download-all-instances', function () {
        const clicked = $(this);
        getDirectory().then(handle => {
            const bucket = clicked.attr('data-bucket');
            const crdc_series_id = clicked.attr('data-series');
            const series_id = clicked.attr('data-series-id');
            const collection_id = clicked.attr('data-collection');
            const study_id = clicked.attr('data-study');
            const modality = clicked.attr('data-modality');
            const patient_id = clicked.attr('data-patient');
            downloader_manager.addRequest({
                'directory': handle,
                'bucket': bucket,
                'crdc_series_id': crdc_series_id,
                'series_id': series_id,
                'collection_id': collection_id,
                'study_id': study_id,
                'modality': modality,
                'patient_id': patient_id
            });

            downloader_manager.beginDownloads();
        });
    });
});