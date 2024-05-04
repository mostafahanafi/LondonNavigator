function sendMessage() {
    var message = document.getElementById("message").value;
    var chat = document.getElementById("chat");
    var messageElement = document.createElement('div');
    messageElement.className = 'message outgoing';
    messageElement.innerHTML = message;
    chat.appendChild(messageElement);
    document.getElementById("message").value = '';

    // Simulate a response from the LLM
    setTimeout(function() {
        var replyElement = document.createElement('div');
        replyElement.className = 'message incoming';
        replyElement.innerText = "Here's your response from LLM!";
        chat.appendChild(replyElement);
        chat.scrollTop = chat.scrollHeight; 
    }, 1200);
}