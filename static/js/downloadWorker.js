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

importScripts('https://cdn.jsdelivr.net/npm/dcmjs@0.41.0/build/dcmjs.min.js')

function dicomValue(dataset, tagName) {
    let value = "Undefined-" + tagName;
    const entry = dcmjs.data.DicomMetaDictionary.nameMap[tagName];
    if (entry && entry.tag) {
        const hexTag = entry.tag.replace("(", "").replace(",", "").replace(")", "");
        if (hexTag in dataset.dict) {
            value = dataset.dict[hexTag].Value;
        }
    }
    return value
}

self.onmessage = async function (event) {
    const s3_url = event.data.url;
    try {
        const directoryHandle = event.data.directoryHandle;
        const collection_id = event.data.collection_id || 'unknown_collection';
        response = await fetch(s3_url)
        if (!response.ok) {
            console.error('Worker: Failed to fetch URL:', s3_url, response.statusText);
            self.postMessage({message: "error", error: "Failed to fetch URL"});
            return
        }
        const arrayBuffer = await response.arrayBuffer();
        const dataset = dcmjs.data.DicomMessage.readFile(arrayBuffer);
        const modality = dicomValue(dataset, "Modality");
        const patientID = dicomValue(dataset, "PatientID");
        const sopInstanceUID = dicomValue(dataset, "SOPInstanceUID");
        const studyInstanceUID = dicomValue(dataset, "StudyInstanceUID");
        const seriesInstanceUID = dicomValue(dataset, "SeriesInstanceUID");
        const seriesDirectory = modality + "_" + seriesInstanceUID;
        const filePath = [collection_id, patientID, studyInstanceUID, seriesDirectory].join("/");
        const fileName = sopInstanceUID + ".dcm";
        const blob = new Blob([arrayBuffer], {type: 'application/dicom'});
        const file = new File([blob], fileName, {type: 'application/dicom'});
        const subDirectoryHandle = await createNestedDirectories(directoryHandle, filePath);
        const fileHandle = await subDirectoryHandle.getFileHandle(fileName, {create: true,});
        const writable = await fileHandle.createWritable();
        await writable.write(arrayBuffer);
        await writable.close();
        self.postMessage({message: "done", path: s3_url, localFilePath: filePath});
    } catch (error) {
        console.error("Error when attempting to fetch URL " + s3_url);
        console.error(error);
        self.postMessage({message: "error", path: s3_url, error: error});
    }
}