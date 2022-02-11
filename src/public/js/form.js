// File submit AJAX request
document.getElementById('upload').onsubmit = function () {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/upload');
    let formData = new FormData(this);
    xhr.send(formData);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            let response = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
                console.log(response);
            } else {
                console.log(response.error);
            }
        }
    };
    return false;
};