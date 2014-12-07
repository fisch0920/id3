var DataViewUtils = {};

module.exports = DataViewUtils

DataViewUtils.getString = function (dv, length, offset, raw) {
	offset = offset || 0;
	length = length || (dv.byteLength - offset);
	if(length < 0) {
		length += dv.byteLength;
	}
	var str = '';
  var i

	if(typeof Buffer !== 'undefined') {
		var data = [];
		for (i = offset; i < (offset + length); i++) {
			data.push(dv.getUint8(i));
		}
		return (new Buffer(data)).toString();
	} else {
		for (i = offset; i < (offset + length); i++) {
			str += String.fromCharCode(dv.getUint8(i));
		}
		if (raw) {
			return str;
		}
		return decodeURIComponent(encodeURIComponent(str));
	}
};

DataViewUtils.getStringUtf16 = function (dv, length, offset, bom) {
	offset = offset || 0;
	length = length || (dv.byteLength - offset);
	var littleEndian = false,
		str = '',
		useBuffer = false;
	if(typeof Buffer !== 'undefined') {
		str = [];
		useBuffer = true;
	}
	if(length < 0) {
		length += dv.byteLength;
	}
	if(bom) {
		var bomInt = dv.getUint16(offset);
		if(bomInt === 0xFFFE) {
			littleEndian = true;
		}
		offset += 2;
		length -= 2;
	}
	for(var i = offset; i < (offset + length); i += 2) {
		var ch = dv.getUint16(i, littleEndian);
		if((ch >= 0 && ch <= 0xD7FF) || (ch >= 0xE000 && ch <= 0xFFFF)) {
			if(useBuffer) {
				str.push(ch);
			} else {
				str += String.fromCharCode(ch);
			}
		} else if(ch >= 0x10000 && ch <= 0x10FFFF) {
			ch -= 0x10000;
			if(useBuffer) {
				str.push(((0xFFC00 & ch) >> 10) + 0xD800);
				str.push((0x3FF & ch) + 0xDC00);
			} else {
				str += String.fromCharCode(((0xFFC00 & ch) >> 10) + 0xD800) + String.fromCharCode((0x3FF & ch) + 0xDC00);
			}
		}
	}
	if(useBuffer) {
		return str.toString();
	} else {
		return decodeURIComponent(encodeURIComponent(str));
	}
};

DataViewUtils.getUint8Synch = function (dv, offset) {
	return getSynch(dv.getUint8(offset));
};

DataViewUtils.getUint32Synch = function (dv, offset) {
	return getSynch(dv.getUint32(offset));
};

DataViewUtils.getUint8 = function (dv, offset) {
  return dv.getUint8(offset);
};

/*
 * Not really an int as such, but named for consistency
 */
DataViewUtils.getUint24 = function (dv, offset, littleEndian) {
	if(littleEndian) {
		return dv.getUint8(offset) + (dv.getUint8(offset + 1) << 8) + (dv.getUint8(offset + 2) << 16);
	}
	return dv.getUint8(offset + 2) + (dv.getUint8(offset + 1) << 8) + (dv.getUint8(offset) << 16);
};

function getSynch (num) {
	var out = 0,
		mask = 0x7f000000;
	while(mask) {
		out >>= 1;
		out |= num & mask;
		mask >>= 8;
	}
	return out;
}

