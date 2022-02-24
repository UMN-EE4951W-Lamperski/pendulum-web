// This is split into comments so it doesn't look as gross with the closure tabs

window.onload = function () {
    document.getElementById('nojs').hidden = true;
    document.getElementById('block').hidden = false;
};

// File submit AJAX request
// After successful upload, actuate the file by calling actuate() on the successfully uploaded file
document.getElementById('upload').onsubmit = function () {
    // Reset error message and success message
    document.getElementById('upload-err').innerText = '';
    document.getElementById('actuate-err').innerText = '';
    document.getElementById('upload-response').innerText = '';
    document.getElementById('download-link').innerText = '';
    // Make AJAX request
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/upload');
    let formData = new FormData(this);
    xhr.send(formData);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            let response = JSON.parse(xhr.responseText);
            if (xhr.status === 201) {
                // Display upload success message to the user
                document.getElementById('upload-response').innerText = response.msg;
                actuate(response);
            } else {
                // Display upload error message to the user
                document.getElementById('upload-err').innerText = response.error;
                // DEBUG: Print full error if unknown error occurs
                if (xhr.status === 500)
                    console.error(response.error_msg);
            }
        }
    };
    document.getElementById('upload').reset();
    return false;
};

// Actuate button AJAX request
// Should always be called after upload
// Implies that upload has been successful since it relies on the upload response
// 
function actuate(file) {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/actuate');
    let data = {
        file: file.file
    };
    xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    xhr.setRequestHeader('X-CSRF-TOKEN', file.csrf);
    xhr.send(JSON.stringify(data));
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            let response = JSON.parse(xhr.responseText);
            if (xhr.status === 200 || xhr.status === 500) {
                createDownload(response.file);
            }
            if (xhr.status === 500) {
                document.getElementById('actuate-err').innerText = response.error;
                // DEBUG: Print full error if unknown error occurs
                console.error(response.error_msg);
            }

        }
        return;
    };
}


// Creates the download element
function createDownload(response) {
    if (!response)
        return;
    const tempName = response.filename;
    const downloadName = response.name.split('.')[ 0 ];
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', `/api/v1/download/?filename=${tempName}`);
    downloadLink.setAttribute('download', `${downloadName}.csv`);
    downloadLink.innerText = 'Download CSV of results here.';
    document.getElementById('download-link').appendChild(downloadLink);
    return;
}