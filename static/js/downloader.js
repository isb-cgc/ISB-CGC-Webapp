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
        underscore: 'libs/underscore-min',
        base: 'base'
    },
    shim: {
        'underscore': {exports: '_'}
    }
});

require([
    'base', // This must always be loaded
], function (base) {

    let downloadWorkers = [];
    let downloadWorker = null;
    const s3_urls = [];

    const workerCode = `
      async function createNestedDirectories(topLevelDirectoryHandle, path) {
        const pathSegments = path.split('/').filter((segment) => segment !== '')
        let currentDirectoryHandle = topLevelDirectoryHandle
        for (const segment of pathSegments) {
          try {
            // Attempt to get the directory handle without creating it
            const entry = await currentDirectoryHandle.getDirectoryHandle(segment, {
              create: false,
            })
            currentDirectoryHandle = entry
          } catch (error) {
            // If the error is specifically about the directory not existing, create it
            if (error .name === 'NotFoundError') {
              const entry = await currentDirectoryHandle.getDirectoryHandle(segment, {
                create: true,
              })
              currentDirectoryHandle = entry
            } else {
              // Handle other potential errors (e.g., name conflicts)
              return false // Indicate failure
            }
          }
        }
        // Return the last directory handle
        return currentDirectoryHandle
      }

      importScripts('https://cdn.jsdelivr.net/npm/dcmjs@0.41.0/build/dcmjs.min.js')

      function dicomValue(dataset,tagName) {
          let value = "Undefined-"+tagName
          const entry = dcmjs.data.DicomMetaDictionary.nameMap[tagName]
          if (entry && entry.tag) {
            const hexTag = entry.tag.replace("(","").replace(",","").replace(")","")
            if (hexTag in dataset.dict) {
              value = dataset.dict[hexTag].Value
            }
          }
          return value
      }

      self.onmessage = async function(event) {
          const s3_url = event.data.url
          try {
            const directoryHandle = event.data.directoryHandle
            const collection_id = event.data.collection_id || 'unknown_collection'
            response = await fetch(s3_url)
            if (!response.ok) {
                console.error('Worker: Failed to fetch S3 URL:', s3_url, response.statusText)
                self.postMessage({message: "error", error: "Failed to fetch S3 URL"})
                return
            }
            const arrayBuffer = await response.arrayBuffer()
            const dataset = dcmjs.data.DicomMessage.readFile(arrayBuffer)
            const modality = dicomValue(dataset,"Modality")
            const patientID = dicomValue(dataset,"PatientID")
            const sopInstanceUID = dicomValue(dataset,"SOPInstanceUID")
            const studyInstanceUID = dicomValue(dataset,"StudyInstanceUID")
            const seriesInstanceUID = dicomValue(dataset,"SeriesInstanceUID")
            const seriesDirectory = modality + "_" + seriesInstanceUID
            const filePath = [collection_id,patientID,studyInstanceUID,seriesDirectory].join("/")
            const fileName = sopInstanceUID + ".dcm"
            const blob = new Blob([arrayBuffer], { type: 'application/dicom' })
            const file = new File([blob], fileName, { type: 'application/dicom' })
            const subDirectoryHandle = await createNestedDirectories(directoryHandle, filePath)
            const fileHandle = await subDirectoryHandle.getFileHandle(fileName, { create: true, })
            const writable = await fileHandle.createWritable()
            await writable.write(arrayBuffer)
            await writable.close()
            self.postMessage({message: "done", path: s3_url, localFilePath: filePath})
          } catch (error) {
            console.error(error)
            self.postMessage({message: "error", path: s3_url, error: error})
          }

      }
    `;

    const workerCodeBlob = new Blob([workerCode], { type: 'application/javascript' });
    const workerObjectURL = URL.createObjectURL(workerCodeBlob);
    const workerDownloadThreshold = 100;
    const availableWorkers = [];

    function finalizeWorker(worker) {
      worker.terminate();
      downloadWorkers = downloadWorkers.filter(w => w !== worker);
    }

    // TODO: replace with call to JS messenger block
    function statusMessage(message) {
      const messageP = document.createElement("p");
      messageP.innerText = message;
      document.body.appendChild(messageP);
    }
    const progressP = document.querySelector("#progress");
    function progressUpdate(message) {
      progressP.innerText = message;
    }

    function workerOnMessage (event) {
      let thisWorker = event.target;
      if (event.data.message === 'error') {
        statusMessage(`Error ${JSON.stringify(event.data)}`);
      }
      if (event.data.message === 'done') {
        progressUpdate(`${s3_urls.length} remaining: ${event.data.path} downloaded`);
      }
      if (s3_urls.length == 0 || thisWorker.downloadCount > workerDownloadThreshold) {
        finalizeWorker(thisWorker);
      } else {
        thisWorker.downloadCount += 1;
        availableWorkers.push(thisWorker);
      }
      triggerWorkerDownloads();
    }

    function allocateWorker() {
      downloadWorker = new Worker(workerObjectURL);
      downloadWorker.onmessage = workerOnMessage;
      downloadWorker.onerror = function(event) {
        let thisWorker = event.target
        console.error('Main: Error in worker:', event.message, event);
        statusMessage('Main: Error in worker:', event.message, event);
        finalizeWorker(thisWorker);
      }
      downloadWorkers.downloadCount = 0;
      downloadWorkers.push(downloadWorker);
      return downloadWorker
    }

    let workerLimit = navigator.hardwareConcurrency;
    let directoryHandle = null;

    function triggerWorkerDownloads() {
      if (s3_urls.length == 0 && downloadWorkers.length == 0) {
        if (workerObjectURL) URL.revokeObjectURL(workerObjectURL);
        statusMessage(`Downloads complete`);
      } else {
        while (s3_urls.length > 0) {
          let targetWorker = null;
          if (availableWorkers.length > 0) {
            targetWorker = availableWorkers.pop();
          } else {
            if (downloadWorkers.length <= workerLimit) {
              targetWorker = allocateWorker();
            } else {
              break // all workers busy and we can't add more
            }
          }
          const s3_url = s3_urls.pop();
          targetWorker.postMessage({ url: s3_url, collection_id: collection_id, directoryHandle: directoryHandle });
        }
      }
    }

    async function getAllS3ObjectKeys(bucket, region, prefix) {
      const allKeys = [];
      let isTruncated = true;
      let continuationToken = null;
      while (isTruncated) {
        let url = `https://${bucket}.s3.${region}.amazonaws.com/?list-type=2`;
        if (prefix) {
          url += `&prefix=${encodeURIComponent(prefix)}`;
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

    async function beginDownload() {
      directoryHandle = await window.showDirectoryPicker({
          id: 'idc-downloads',
          startIn: 'downloads',
          mode: 'readwrite',
      });
      if (directoryHandle) {
          triggerWorkerDownloads();
      }
    }

    $('.container-fluid').on('.download-all-instances', 'click', function(){
        let bucket = $(this).attr('data-bucket');
        let crdc_series_id = $(this).attr('data-crdc-series-id');
        getAllS3ObjectKeys(bucket, "us-east-1", crdc_series_id).then( keys => {
          keys.forEach((key) => {
            if (key != "") {
              s3_urls.push(`https://${bucket}.s3.us-east-1.amazonaws.com/${key}`);
            }
          });
          beginDownload().then(
              // TODO: use JS messager
              function(){statusMessage("Download complete.");}
          );
        });
    });
});