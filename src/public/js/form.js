window.onload = function () {
    document.getElementById('nojs').hidden = true;
    document.getElementById('block').hidden = false;
};  

// File submit AJAX request
document.getElementById('upload').onsubmit = function () {
    // Reset error message
    document.getElementById('upload-err').innerText = '';
    document.getElementById('actuate-err').innerText = '';
    // Make AJAX request
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/upload');
    let formData = new FormData(this);
    xhr.send(formData);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            let response = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
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
    return false;
};

function actuate(file) {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/actuate');
    let data = {
        name: file.name,
        path: file.path,
    };
    xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    xhr.setRequestHeader('X-CSRF-TOKEN', file.csrf);
    xhr.send(JSON.stringify(data));
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            let response = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
                console.log(response);
            } else {
                // Display upload error message to the user
                document.getElementById('actuate-err').innerText = response.error;
                // DEBUG: Print full error if unknown error occurs
                if (xhr.status === 500)
                    console.error(response.error_msg);
            }
        }
    };
}