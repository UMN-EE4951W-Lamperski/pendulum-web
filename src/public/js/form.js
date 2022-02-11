document.getElementById('upload').onsubmit = function () {
    var data = new FormData(document.getElementById('upload'));
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.send(data);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            if (response.success) {
                document.getElementById('success').style.display = 'block';
            } else {
                document.getElementById('error').style.display = 'block';
            }
        }
    };
    return false;
};
