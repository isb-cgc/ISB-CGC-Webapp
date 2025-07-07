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
        base: 'base',
        text: 'libs/text',
        downloadWorker: 'downloadWorker'
    }
});

require([
    'base', 'jquery', 'text!downloadWorker.js'
], function (base, $, workerCode) {

    let downloadWorkers = [];
    let downloadWorker = null;
    const s3_urls = [];

    const workerCodeBlob = new Blob([workerCode], { type: 'application/javascript' });
    const workerObjectURL = URL.createObjectURL(workerCodeBlob);
    const workerDownloadThreshold = 100;
    const availableWorkers = [];

    function finalizeWorker(worker) {
      worker.terminate();
      downloadWorkers = downloadWorkers.filter(w => w !== worker);
    }

    function statusMessage(message, type) {
      base.showJsMessage(type, message, true);
    }
    function progressUpdate(message) {
      base.showJsMessage('info', message, true);
    }

    function workerOnMessage (event) {
      let thisWorker = event.target;
      if (event.data.message === 'error') {
        statusMessage(`Worker Error ${JSON.stringify(event)}`, 'error', true);
      }
      if (event.data.message === 'done') {
        progressUpdate(`Download progress: ${s3_urls.length} remaining, ${event.data.path} downloaded`);
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
        console.error('Main: Error in worker:', event.message || "No message given", event);
        statusMessage(`Error in worker: ${event.message}`, 'error', true);
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
        statusMessage(`Downloads complete`, 'info', true);
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

    $('.container-fluid').on('click', '.download-all-instances', function(){
        let bucket = $(this).attr('data-bucket');
        let crdc_series_id = $(this).attr('data-series');
        getAllS3ObjectKeys(bucket, "us-east-1", crdc_series_id).then( keys => {
          keys.forEach((key) => {
            if (key !== "") {
              s3_urls.push(`https://${bucket}.s3.us-east-1.amazonaws.com/${key}`);
            }
          });
          if(s3_urls.length <= 0) {
              statusMessage('Error while parsing instance list!', 'error');
              return;
          }
          beginDownload().then(
              function(){statusMessage("Download underway.", 'info');}
          );
        });
    });
});