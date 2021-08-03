const
io = require("socket.io-client"),
ioClient = io.connect("http://localhost:9999");

ioClient.emit('pumps','1;2;8:45pm 25-7-2021');
ioClient.emit('sensors','15 deg.C;445ppm');
ioClient.emit('levels','2;1;124:35');