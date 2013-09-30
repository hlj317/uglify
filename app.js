
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , fs = require('fs')
  , socket = require('socket.io')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3003);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//请求根目录路径，渲染一键压缩页面
app.get('/', function(req,res){
    res.render('uglify', { title: '一键压缩' });
});

//socket监听客户端
var io = socket.listen( server );

//为socket定义参数配置
io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 100);  
});

//socket连接后绑定回调函数
io.sockets.on( 'connection', function( socket ){

  //socket绑定allUglify事件
  socket.on('allUglify',function(data){

    var uglifyUrl = data.uglifyUrl;
    var response = allUglify(uglifyUrl,socket);

  });

  //socket绑定disconnect事件
  socket.on( 'disconnect', function(data){

    //socket利用leave事件，广播message消息到所有客户端
    socket.emit('leave', {'message':'服务器断开'});
    
  });

});

function allUglify(uglifyUrl,socket){

    socket.emit('loading', {'progress':2}); 

    var walk = require('walk'),
        files = {},
        n = 0;

    function _walk(uglifyUrl){
        var dirList = fs.readdirSync(uglifyUrl);
        dirList.forEach(function(item){
            var _dir = fs.statSync(uglifyUrl + '/' + item);
            if(_dir.isDirectory()){
                files[++n] = [uglifyUrl + '/' +item];
                _walk(uglifyUrl  + '/' + item);
            }else{
                files[n].push(uglifyUrl + '/' +item);
            }
        });
    }

    _walk(uglifyUrl);

    var i,
        file,
        type,
        imgLen = 0;

    for( i in files ){
      
      file = files[i];

      if( file.length == 1 ){
          delete file;
          continue;
      }

      if( !(type = /(.js)|(.css)|(\.gif|\.jpg|\.png|\.jpeg)/.exec( file[1] ) ) || !type.length ){
          continue;
      }

      type[1] && jsMinifier( file.shift() + '/js-min.js', file ); 
  
      type[2] && cssMinifier( file.shift() + '/css-min.css', file ); 
  
      type[3] && !function(){

          imgLen++;

          imagesMinifier( file[0], function(){
              
              if( !--imgLen ){
                 complete();
              }else{
                 socket.emit( 'loading', { 'progress': Math.floor( ( totalImgLen - imgLen ) / totalImgLen * 100 )}); 
              }

          });

      }(); 
  
      
    }

    var totalImgLen = imgLen;

    imgLen ? socket.emit('loading', {'progress': 7 }) : complete();

    function complete(){
        socket.emit('loading', {'progress':100}); 
    }

    //js合并压缩
    function jsMinifier(fileOut, flieIn) {
         var jsp = require("uglify-js").parser;
         var pro = require("uglify-js").uglify; 
         var flieIn=Array.isArray(flieIn)? flieIn : [flieIn];
         var origCode,ast,finalCode='';
         for(var i=0; i<flieIn.length; i++) {
            origCode = fs.readFileSync(flieIn[i], 'utf8');
            ast = jsp.parse(origCode);
            ast = pro.ast_mangle(ast);
            ast= pro.ast_squeeze(ast); 
            finalCode +=';'+ pro.gen_code(ast);
         }
        fs.writeFileSync(fileOut, finalCode, 'utf8');
    }

    //css合并压缩
    function cssMinifier( fileOut, flieIn ) {
         var cleanCSS = require('clean-css');
         var flieIn=Array.isArray(flieIn)? flieIn : [flieIn];
         var origCode,finalCode='';
         for(var i=0; i<flieIn.length; i++) {
            origCode = fs.readFileSync(flieIn[i], 'utf8');
            finalCode += cleanCSS.process(origCode); 
         }
        fs.writeFileSync(fileOut, finalCode, 'utf8');
    }

    //图片压缩
    function imagesMinifier(flieIn,callback){
       var imgMinifier = require('node-smushit');
       imgMinifier.smushit(flieIn, {recursive: true,
          onComplete: function(reports){
              callback();
          }
       }); 
    }


}


