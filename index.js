const { doesNotThrow } = require('assert');
const { time } = require('console');

var app    = require('express')();
var server = require('http').createServer(app);
var web_io     = require('socket.io')(server);
const fs = require('fs');
const papa = require('papaparse');

const web_port = 8888;
const socket_port = 9999;
const pumps_path = 'Data/pumps.csv'
const levels_path = 'Data/levels.csv'
const sensors_path = 'Data/sensors.csv'

//webpage variables to updates the pages upon connection
//pass this order to the reload function
var temp,tds,p_1,p_2,p_off,p_auto,p_Tstart= '';
var levels = [];

function reload_page(){
    get_backUp()
    try{
        var all_data = [temp,tds,p_1,p_2,p_off,p_auto,p_Tstart].join(';');
        for (let i=0;i<3;i++){
            for(let j=0;j<4;j++){
                all_data+=';'+levels[i][j]
            }
        }
        web_io.emit('reload',all_data);
    }
    catch{
        console.log('.')
    }
}

function update_sensors(message){
    console.log("updating sensors") ;
    var data = message.split(';');
    temp = data[0];
    tds = data[1];
    web_io.emit('temp',temp);
    web_io.emit('tds',tds);
    backUp_sensors()
}

function update_pumps(message){
    console.log('updating pumps');
    var data = message.split(';');
    p_auto = data[0];
    p_Tstart = data[2];
    console.log(p_Tstart)
    const pump = data[1];
    
    web_io.emit('p_auto',p_auto);
    web_io.emit('p_Tstart',p_Tstart);
    
    if (pump == '1'){
        web_io.emit('p_1','1');
        
        p_1 = '1';
        p_2 = '0';
        p_off = '0';
    }
    else if (pump=='2'){
        web_io.emit('p_2','1');
        
        p_1 = '0';
        p_2 = '1';
        p_off = '0'; 
    }
    else if (pump == '0'){
        web_io.emit('p_off','1');

        p_1 = '0';
        p_2 = '0';
        p_off = '1';  
    }
    backUp_pumps()
}

function update_levels(message){
    console.log('updating levels');
    const data = message.split(';');
    const nb = parseInt(data[0]);
    const state = parseInt(data[1]);
    const curr = data[3]

    levels[nb][state] = data[2];

    web_io.emit('level',message);
    backUp_levels(nb,state,data[2]);
}
function get_backUp(){
    //set the webpage variables according to csv backUp file
    const file_p = fs.createReadStream(pumps_path);
    papa.parse(file_p, {
        header : false,
        step: function(result) {
            [p_1,p_2,p_off,p_auto,p_Tstart] = result.data
        },
        complete: function() {
            
        }
    });
    const file_s = fs.createReadStream(sensors_path);
    papa.parse(file_s, {
        header : false,
        step: function(result) {
            [temp,tds] = result.data
        },
        complete: function() {
        }
    });
    const file_l = fs.createReadStream(levels_path);
    papa.parse(file_l, {
        header : false,
        step: function(result) {
            var str = result.data.toString()
            var data = str.split(',')
            levels.push(data)
        },
        complete: function() {
        }
    });
}

function backUp_pumps(){
    let csv = [p_1,p_2,p_off,p_auto,p_Tstart].join(',')
    fs.writeFile(pumps_path, csv, 'utf8', function (err) {
        if (err) {
            console.log('Some error occured - file either not saved or corrupted file saved.');
        } else{
            console.log('pumps updated');
        }
        });
}
function backUp_sensors(){
    let csv = [temp,tds,'0'].join(',')
    fs.writeFile(sensors_path, csv, 'utf8', function (err) {
        if (err) {
            console.log('Some error occured - file either not saved or corrupted file saved.');
        } else{
            console.log('sensors saved!');
        }
        });
}
function backUp_levels(){
    let csv = papa.unparse(levels)
    fs.writeFile(levels_path, csv, 'utf8', function (err) {
        if (err) {
            console.log('Some error occured - file either not saved or corrupted file saved.');
        } else{
            console.log('levels updated');
        }
        });
}
server.listen(web_port);

app.get('/', function(req, res) {
    res.sendFile('index.html',{ root: '.' });
});
web_io.on('connection',function(){
    reload_page()
})

const {Server} = require("socket.io")
console.log(Server.version)
aqua_io = new Server(socket_port);

// event fired every time a new client connects:
aqua_io.on("connection", (socket) => {
    console.info(`Client connected [id=${socket.id}]`);
    
    socket.on("disconnect", () => {
        console.info(`Client gone [id=${socket.id}]`);
    });
    //event management
    socket.on('sensors', function(data) {
        update_sensors(data);
    });
    socket.on('pumps', function(data) {
        update_pumps(data);
    });
    socket.on('level', function(data) {
        update_levels(data);
    });
  
});