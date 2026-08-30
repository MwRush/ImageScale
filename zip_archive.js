const zip_crc_table = new Uint32Array(256);

for (let index = 0; index < zip_crc_table.length; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    zip_crc_table[index] = value >>> 0;
}

function calculate_crc_32(bytes) {
    let value = 0xffffffff;

    for (const byte of bytes) {
        value = zip_crc_table[(value ^ byte) & 0xff] ^ (value >>> 8);
    }

    return (value ^ 0xffffffff) >>> 0;
}

function get_dos_date_time(input_date) {
    const date = input_date instanceof Date && !Number.isNaN(input_date.getTime()) ? input_date : new Date();
    const year = Math.min(2107, Math.max(1980, date.getFullYear()));
    const dos_date = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    const dos_time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);

    return { dos_date, dos_time };
}

function create_local_header(name_bytes, size, crc_32, dos_date, dos_time) {
    const header = new Uint8Array(30 + name_bytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, dos_time, true);
    view.setUint16(12, dos_date, true);
    view.setUint32(14, crc_32, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, name_bytes.length, true);
    view.setUint16(28, 0, true);
    header.set(name_bytes, 30);

    return header;
}

function create_central_header(name_bytes, size, crc_32, dos_date, dos_time, local_offset) {
    const header = new Uint8Array(46 + name_bytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, dos_time, true);
    view.setUint16(14, dos_date, true);
    view.setUint32(16, crc_32, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, name_bytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, local_offset, true);
    header.set(name_bytes, 46);

    return header;
}

function create_end_record(entry_count, central_size, central_offset) {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);

    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entry_count, true);
    view.setUint16(10, entry_count, true);
    view.setUint32(12, central_size, true);
    view.setUint32(16, central_offset, true);
    view.setUint16(20, 0, true);

    return record;
}

async function create_zip_archive(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        throw new Error('empty_archive');
    }

    if (entries.length > 65535) {
        throw new Error('too_many_files');
    }

    const encoder = new TextEncoder();
    const local_parts = [];
    const central_parts = [];
    let local_offset = 0;

    for (const entry of entries) {
        const name_bytes = encoder.encode(entry.path);

        if (name_bytes.length === 0 || name_bytes.length > 65535) {
            throw new Error('invalid_path');
        }

        if (!(entry.blob instanceof Blob) || entry.blob.size > 0xffffffff) {
            throw new Error('file_too_large');
        }

        const bytes = new Uint8Array(await entry.blob.arrayBuffer());
        const crc_32 = calculate_crc_32(bytes);
        const { dos_date, dos_time } = get_dos_date_time(entry.date);
        const local_header = create_local_header(name_bytes, bytes.length, crc_32, dos_date, dos_time);
        const central_header = create_central_header(name_bytes, bytes.length, crc_32, dos_date, dos_time, local_offset);

        local_parts.push(local_header, bytes);
        central_parts.push(central_header);
        local_offset += local_header.byteLength + bytes.byteLength;

        if (local_offset > 0xffffffff) {
            throw new Error('archive_too_large');
        }
    }

    const central_offset = local_offset;
    const central_size = central_parts.reduce((total, part) => total + part.byteLength, 0);

    if (central_offset + central_size > 0xffffffff) {
        throw new Error('archive_too_large');
    }

    const end_record = create_end_record(entries.length, central_size, central_offset);

    return new Blob([...local_parts, ...central_parts, end_record], { type: 'application/zip' });
}

globalThis.create_zip_archive = create_zip_archive;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create_zip_archive };
}
