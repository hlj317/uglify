//客户端连接socket.io服务
var sio = io.connect(),
    _pro = 0;    //压缩进度百分比

//连接服务，连接成功提示
sio.on('connect', function( socket ){
   console.log('##################websocket连接成功！##################');
});

//点击一键压缩，发送'要压缩的目录'到后端
$('#uglify').on('click',function(){

    //websocket触发后端的allUglify事件，同时把数据传到后端
    sio.emit('allUglify', { uglifyUrl: './test/'} );

});

//websocket绑定后端定义的complete事件，连接断开提示
sio.on('leave',function(data){

    alert(data.message);

});

//websocket绑定后端定义的loading事件，进度条加载进度
sio.on('loading',function(data){
   var progress = parseFloat(data.progress);
   $('.meter span').animate({'width': progress + '%'},(progress - _pro) * 50,null,function(){
   		if(progress == 100){
   			alert('压缩成功，真棒！');
   		}
   });
   scrollNum(data.progress);
});

//数字滚动动画
function scrollNum(n){
   var time = setInterval(function(){
   	    if(_pro >= n || _pro >= 100){
          clearInterval(time);
        }
        $('.text').html(_pro+'%');
        _pro++;
   },45);
}
