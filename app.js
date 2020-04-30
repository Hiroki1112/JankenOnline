'use strict';
var http = require('http');
var socketio = require('socket.io');
var fs = require('fs');
var server = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync(__dirname + '/index.html', 'utf-8'));
}).listen(3000);  // ポート競合の場合は値を変更

var io = socketio.listen(server);
var te = {};
var count = {};
count.room01 = 0;
count.room02 = 0;
var member = {};
member.room01 = ['a', 'a'];
member.room02 = ['a', 'a'];
io.sockets.on('connection', function(socket) {
    var room = '';
    var name = '';
    var id = socket.id;
    
    socket.on('client_to_server_join', function(data) {
        room = data.value.selectRoom;
        name = data.value.name;
        var sz = count[room];
        if(typeof(sz) === 'undefined') sz = 0;
        console.log(sz, typeof(sz));
        if(sz <= 1){
            socket.join(room);
            var ok = true;
            socket.emit("isConnected", {value: ok});
            console.log(name + "さん接続できたよ!");
            te[id] = -1;
            console.log(room, typeof(room));
            count[room]++;
            member[room][sz] = id;
        }else {
            var ok = false;
            socket.emit("isConnected", {value: ok});
        } 
    });
    socket.on("janken_to_server", (data) => {
        var janken = data.value.janken;
        te[id] = janken;
        console.log(data.value, janken);
        socket.emit("message_to_client", {value: janken + "受け取ったぜ！"});
        if(count[room] === 2){
            if(te[member[room][0]] != -1 && te[member[room][1]] != -1){
                console.log("ジャンケン可能")
                //ジャンケンをする, 手を
                var te0 = parseInt(te[member[room][0]]), te1 = parseInt(te[member[room][1]]);
                if( te0 === te1){
                    io.sockets.in(room).emit("message_to_client", {value:"引き分け!相手も"+te0+"を出しました!"});
                }else if((te0+1)%3 === te1){//te0がかつ
                    io.to(member[room][0]).emit('message_to_client', {value: "勝利!相手は"+te1+"を出しました"});
                    io.to(member[room][1]).emit('message_to_client', {value: "残念!相手は"+te0+"を出しました"});
                }else{
                    io.to(member[room][1]).emit('message_to_client', {value: "勝利!相手は"+te0+"を出しました"});
                    io.to(member[room][0]).emit('message_to_client', {value: "残念!相手は"+te1+"を出しました"});
                }
                te[member[room][0]] = -1;
                te[member[room][1]] = -1;
            }else{
                io.to(id).emit('message_to_client', {value: "相手の手を待ってます"});
            }
        }
    });
    socket.on('client_to_server_broadcast', (data) => {
        socket.broadcast.to(room).emit("message_to_client", {value : data.value} );
    })
    socket.on('disconnect', ()=>{
        te[id] = -1;
        count[room]--;
    })
});