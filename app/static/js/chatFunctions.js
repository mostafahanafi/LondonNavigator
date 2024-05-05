function sendMessage() {
    var message = document.getElementById("message").value;
    var chat = document.getElementById("chat");
    var messageElement = document.createElement('div');
    messageElement.className = 'message outgoing';
    messageElement.innerHTML = message;
    chat.appendChild(messageElement);
    document.getElementById("message").value = '';

    fetch('/chat', {
        method: 'POST',
        body: `message=${encodeURIComponent(message)}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        var replyElement = document.createElement('div');
        replyElement.className = 'message incoming';
        replyElement.innerText = data;
        chat.appendChild(replyElement);
        chat.scrollTop = chat.scrollHeight; 
    })
    .catch(error => {
        console.error('Error:', error);
    });
}