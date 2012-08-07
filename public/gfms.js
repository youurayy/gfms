$(function() {
	
	var filename = $('#content').data('filename');
	
	var WebSocketRPC = InitWebSocketRPC(WebSocket);
	var ws = new WebSocketRPC('ws://' + window.location.host + '/');
	
	ws.on('update', function(data) {
		if(filename === data.update)
			$('div.markdown-body').html(data.content);
	});
	
});