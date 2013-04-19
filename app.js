
/**
 * Module dependencies.
 */

// подключим сеть
var net = require('net');

var CRC_ARC_TAB = new Array(

    0x0000,0xC0C1,0xC181,0x0140,0xC301,0x03C0,0x0280,0xC241,0xC601,0x06C0,0x0780,0xC741,0x0500,
    0xC5C1,0xC481,0x0440,0xCC01,0x0CC0,0x0D80,0xCD41,0x0F00,0xCFC1,0xCE81,0x0E40,0x0A00,0xCAC1,
    0xCB81,0x0B40,0xC901,0x09C0,0x0880,0xC841,0xD801,0x18C0,0x1980,0xD941,0x1B00,0xDBC1,0xDA81,
    0x1A40,0x1E00,0xDEC1,0xDF81,0x1F40,0xDD01,0x1DC0,0x1C80,0xDC41,0x1400,0xD4C1,0xD581,0x1540,
    0xD701,0x17C0,0x1680,0xD641,0xD201,0x12C0,0x1380,0xD341,0x1100,0xD1C1,0xD081,0x1040,0xF001,
    0x30C0,0x3180,0xF141,0x3300,0xF3C1,0xF281,0x3240,0x3600,0xF6C1,0xF781,0x3740,0xF501,0x35C0,
    0x3480,0xF441,0x3C00,0xFCC1,0xFD81,0x3D40,0xFF01,0x3FC0,0x3E80,0xFE41,0xFA01,0x3AC0,0x3B80,
    0xFB41,0x3900,0xF9C1,0xF881,0x3840,0x2800,0xE8C1,0xE981,0x2940,0xEB01,0x2BC0,0x2A80,0xEA41,
    0xEE01,0x2EC0,0x2F80,0xEF41,0x2D00,0xEDC1,0xEC81,0x2C40,0xE401,0x24C0,0x2580,0xE541,0x2700,
    0xE7C1,0xE681,0x2640,0x2200,0xE2C1,0xE381,0x2340,0xE101,0x21C0,0x2080,0xE041,0xA001,0x60C0,
    0x6180,0xA141,0x6300,0xA3C1,0xA281,0x6240,0x6600,0xA6C1,0xA781,0x6740,0xA501,0x65C0,0x6480,
    0xA441,0x6C00,0xACC1,0xAD81,0x6D40,0xAF01,0x6FC0,0x6E80,0xAE41,0xAA01,0x6AC0,0x6B80,0xAB41,
    0x6900,0xA9C1,0xA881,0x6840,0x7800,0xB8C1,0xB981,0x7940,0xBB01,0x7BC0,0x7A80,0xBA41,0xBE01,
    0x7EC0,0x7F80,0xBF41,0x7D00,0xBDC1,0xBC81,0x7C40,0xB401,0x74C0,0x7580,0xB541,0x7700,0xB7C1,
    0xB681,0x7640,0x7200,0xB2C1,0xB381,0x7340,0xB101,0x71C0,0x7080,0xB041,0x5000,0x90C1,0x9181,
    0x5140,0x9301,0x53C0,0x5280,0x9241,0x9601,0x56C0,0x5780,0x9741,0x5500,0x95C1,0x9481,0x5440,
    0x9C01,0x5CC0,0x5D80,0x9D41,0x5F00,0x9FC1,0x9E81,0x5E40,0x5A00,0x9AC1,0x9B81,0x5B40,0x9901,
    0x59C0,0x5880,0x9841,0x8801,0x48C0,0x4980,0x8941,0x4B00,0x8BC1,0x8A81,0x4A40,0x4E00,0x8EC1,
    0x8F81,0x4F40,0x8D01,0x4DC0,0x4C80,0x8C41,0x4400,0x84C1,0x8581,0x4540,0x8701,0x47C0,0x4680,
    0x8641,0x8201,0x42C0,0x4380,0x8341,0x4100,0x81C1,0x8081,0x4040
);

function crcArcAdd(crc,c)
{
    return CRC_ARC_TAB[(crc^c)&0xFF]^((crc>>8)&0xFF);
};

function crcModbusHex(buf,length)
{
    var	crc = 65535

    for (var i = 0, len = length; i < len; ++i)
    {
        crc = crcArcAdd(crc, buf[i]);
    }

    return crc;
};

function crcfunc(buf,len)
{
    var i,j;
    var crc = 0;

    i = 2;
    len-=2;

    while ( len-- > 0 )
    {
        var tmp = buf[i];
        crc = ((crc&0xFFFF) ^ tmp << 8)&0xFFFF;
        i++;
        for ( j=0; j < 8; j++ )
        {
            if((crc&0x8000)>0) crc = (((crc << 1)&0xFFFF) ^ 0x1021)&0xFFFF;
            else crc = (crc&0xFFFF) << 1;
        }
    }

    buf[i]   = (crc&0xFF00)>>8;
    buf[i+1] = crc&0xFF;
}

var DLE = 0x10;
var SOH = 0x01;
var IS1 = 0x1F;
var STX = 0x02;
var ETX = 0x03;

// чтение архива
var READ_ARCH = 0x41;
var TSRV024   = 24;

// заполнение задания на чтение архива
function fill_task_read_archive(buf,datafrom,datato)
{
    // число попыток
    buf[9] = 3;
    // только суточные
    buf[10] = 1;

    // дата от
    buf[11] = datafrom[0];
    buf[12] = datafrom[1];
    buf[13] = datafrom[2];
    buf[14] = datafrom[3];

    // дата до
    buf[15] = datato[0];
    buf[16] = datato[1];
    buf[17] = datato[2];
    buf[18] = datato[3];
}

// запрос на чтение архива
function read_modbus_archive_by_time(buf,archive,hour,day,mounth,year)
{
    var tmp = new Buffer(15);
    var crc;

    tmp[0] = buf[10] = 0x01;
    tmp[1] = buf[11] = 0x41;

    tmp[2] = buf[12] = (archive&0xFF00)>>8; // номер архива
    tmp[3] = buf[13] =  archive&0xFF;

    tmp[4] = buf[14] = 0x00; // количество записей
    tmp[5] = buf[15] = 0x01;

    tmp[6] = buf[16] = 0x01; // тип запроса

    tmp[7] = buf[17] = 0;           // секунды
    tmp[8] = buf[18] = 0;           // минуты
    tmp[9] = buf[19] = hour;        // часы
    tmp[10] = buf[20] = day;        // день
    tmp[11] = buf[21] = mounth;     // месяц
    tmp[12] = buf[22] = year;       // год

    crc = crcModbusHex(tmp,13);

    buf[23] = crc&0xFF;
    buf[24] = (crc&0xFF00)>>8;

    return 15;
}

function fill_modbus_request(buf)
{

}


// функция
function sendspd(func,port,modbus_func,device_type,archive_number)
{
    var buf;
    // архив вычислителя
    var device = new Object();

    var socket = new net.Socket();
    socket.connect(port,"91.190.93.137",function (connection) {
        console.log('Socket connected to port %s', port);
        // законектились - отправим что-то

        if(func == 0x28)            // прямое обращение к прибору
        {
            buf = new Buffer(29);

            buf[0] = DLE;
            buf[1] = SOH;
            buf[2] = 0x00;
            buf[3] = 0x01;
            buf[4] = DLE;
            buf[5] = IS1;
            buf[6] = func&0xFF;
            buf[7] = 0xaa;
            buf[8] = DLE;
            buf[9] = STX;

            var len;
            if(modbus_func == 0x41)             // чтение архива
            {
                if(typeof archive_number == 'undefined' ) var archive_number = 0;

                len = read_modbus_archive_by_time(buf,archive_number,23,1,4,13);
            }
            else if(modbus_func == 0x03)        // чтение регистра
            {

            }
            else if(modbus_func == 0x04)
            {

            }
            else if(modbus_func == 0x06)
            {

            }
            else if(modbus_func == 0x16)
            {

            }

            //
            buf[10+len] = DLE;
            buf[11+len] = ETX;

            crcfunc(buf,12+len);

            //console.log(buf);
        }
        else if(func == 0x3a)       // получение информации
        {   // запрос архивов
            buf = new Buffer(23);

            buf[0] = DLE;
            buf[1] = SOH;
            buf[2] = 0x00;
            buf[3] = 0x00;
            buf[4] = DLE;
            buf[5] = IS1;
            buf[6] = func&0xFF;
            buf[7] = DLE;
            buf[8] = STX;

            var datafrom = new Buffer(4);
            var datato = new Buffer(4);

            datafrom[0] = 0;
            datafrom[1] = 1;
            datafrom[2] = 3;
            datafrom[3] = 13;

            datato[0] = 0;
            datato[1] = 5;
            datato[2] = 3;
            datato[3] = 13;

            // задание на чтение архива
            fill_task_read_archive(buf,datafrom,datato);
            //

            buf[19] = DLE;
            buf[20] = ETX;

            crcfunc(buf,21);
        }
        else if(func == 0x3E)       // чтение архивов прибора
        {   // функция запроса информации
            buf = new Buffer(13);

            buf[0] = DLE;
            buf[1] = SOH;
            buf[2] = 0x00;
            buf[3] = 0x00;
            buf[4] = DLE;
            buf[5] = IS1;
            buf[6] = func&0xFF;
            buf[7] = DLE;
            buf[8] = STX;
            buf[9] = DLE;
            buf[10] = ETX;

            crcfunc(buf,11);
        }
        else if(func == 0x40)       // чтение журнала АССВ
        {
            buf = new Buffer(13);

            buf[0] = DLE;
            buf[1] = SOH;
            buf[2] = 0x00;
            buf[3] = 0x00;
            buf[4] = DLE;
            buf[5] = IS1;
            buf[6] = func&0xFF;
            buf[7] = DLE;
            buf[8] = STX;
            buf[9] = DLE;
            buf[10] = ETX;

            crcfunc(buf,11);
        }
        else if(func == 0x88)       // пароль
        {

        }
        else
        {   // пустое сообщение
            buf = new Buffer(13);
        }

        // пошлем посылку
        socket.write(buf,function () {
            console.log('write ok');
        });

        socket.on('data',function(data){

            var str = new Buffer(data.length);

            var i = 0;
            var j = 0;

            //console.log('1', data);

            if(func == 0x28)
            {
                if(modbus_func == 0x41)
                {   // разберем архив от прибора
                    var dt = new Date();
                    var offset = 13;                            // смещение в кадре спдата до модбас запроса

                    dt.setTime(data.readUInt32BE(offset)*1000);
                    console.log(dt.getDate());

                    if(device_type == TSRV024)
                    {   // тсрв-024

                        // имя
                        device.name = "tsrv024"
                        // время
                        device.record_time = dt;

                        // тепло и массы ТС
                        device.W1 = data.readFloatBE(84 + offset);
                        device.W2 = data.readFloatBE(88 + offset);
                        device.M1 = data.readFloatBE(92 + offset);

                        device.m1 = data.readFloatBE(112 + offset);
                        device.m2 = data.readFloatBE(116 + offset);
                        device.m3 = data.readFloatBE(120 + offset);
                        device.m4 = data.readFloatBE(124 + offset);

                        device.v1 = data.readFloatBE(128 + offset);
                        device.v2 = data.readFloatBE(132 + offset);
                        device.v3 = data.readFloatBE(136 + offset);
                        device.v4 = data.readFloatBE(140 + offset);

                        console.log('W1='+ device.W1 + ' W2=' + device.W2 + ' M1=' + device.M1);
                    }
                }

                // что то от асев получили - закроем сокет
                socket.end();
            }
            else if(func == 0x3a)
            {   // разбор архивов

                // пропустим кадр СПДанных до начала данных ответа
                while(!((data[i] == 0x10) && (data[i+1] == 0x02)))
                {
                    i++;
                }

                {   // начало данных ответа
                    i+=2;

                    if((data[i] == 0x01) && (data[i+1] == 0x11))
                    {   // есть ответ версии
                        i+=2;j=0;
                        var len = data[i];
                        i++;

                        while(len--)
                        {
                            str[j++] = data[i++];
                        }

                        i+=2; //контрольную сумму пропустим

                        console.log('первый ответ', str.toString());
                    }

                    while((data[i] == 0x01) && (data[i+1] == 0x03))
                    {   // есть ответ чтения регистров
                        i+=2;j=0;
                        var len = data[i]; // количество регистров (байтов*2)
                        i++;


                        i+=2; //контрольную сумму пропустим

                        console.log('регистры читаем');
                    }

                    while((data[i] == 0x01) && (data[i+1] == 0x41))
                    {   // есть ответ архивов
                        i+=2;j=0;
                        var len = data[i];
                        i++;
                        while(len--)
                        {
                            str[j++] = data[i++];
                        }

                        i+=2; //контрольную сумму пропустим

                        console.log('архив получен');
                    }

                    if((data[i] == 0x09) && (data[i+1] == 0x0C))
                    {   // конец посылки - положительный ответ - закроем сокет
                        socket.end();
                    }
                }
            }
            else if(func == 0x3e)
            {
                // что то от асев получили - закроем сокет
                socket.end();
            }
            else if(func == 0x40)
            {
                // что то от асев получили - закроем сокет
                socket.end();
            }
        });


        socket.on('end',function(){
            console.log('socket end');
        });

        socket.on('close',function(){
            console.log('socket close');
        });

        socket.on('timeout',function(){
            console.log('socket timeout');
        });

        socket.on('error',function(){
            console.log('socket error');
        });
    });
};

// основное тело
//sendspd(0x3a,3090);
sendspd(0x28,3090,READ_ARCH,TSRV024);