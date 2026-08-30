const messages = {
    ready_to_process: 'Prêt à traiter',
    download_zip: 'Télécharger le ZIP',
    creating_zip: 'Création du ZIP…',
    pending: 'En attente',
    reading: 'Analyse',
    processing: 'Traitement',
    ready: 'Prête',
    invalid_image: 'Image illisible',
    output_too_large: 'Sortie trop grande',
    processing_error: 'Échec du traitement',
    remove_file: 'Retirer ce fichier',
    download_file: 'Télécharger cette image',
    source_dimensions: 'Source : {width} × {height}',
    target_dimensions: 'Cible : {width} × {height}',
    output_path: 'Sortie : {path}',
    files_summary: '{count} fichier(s) · {size}',
    results_summary: '{success} prête(s) · {errors} erreur(s)',
    processing_file: 'Traitement de {name}',
    processing_complete: 'Traitement terminé',
    processing_failed: 'Aucune image n’a pu être traitée',
    processed_summary: '{success} image(s) prête(s), {errors} erreur(s).',
    files_added: '{count} image(s) ajoutée(s).',
    files_ignored: '{count} fichier(s) non image ignoré(s).',
    duplicate_files: '{count} doublon(s) ignoré(s).',
    archive_ready: 'Archive ZIP prête au téléchargement.',
    archive_error: 'Impossible de créer l’archive ZIP.',
    archive_too_large: 'L’archive dépasse la limite ZIP de 4 Go.',
    empty_selection: 'Ajoutez au moins une image valide.',
    settings_changed: 'Réglages modifiés. Relancez le traitement.',
    unknown_dimensions: 'Dimensions en cours de lecture'
};

const maximum_output_pixels = 40000000;
const maximum_canvas_dimension = 16384;
const permanent_error_keys = new Set(['invalid_image']);

const elements = {
    drop_zone: document.getElementById('drop_zone'),
    file_input: document.getElementById('file_input'),
    import_status: document.getElementById('import_status'),
    workspace_section: document.getElementById('workspace_section'),
    clear_button: document.getElementById('clear_button'),
    scale_slider: document.getElementById('scale_slider'),
    scale_value: document.getElementById('scale_value'),
    loss_slider: document.getElementById('loss_slider'),
    loss_value: document.getElementById('loss_value'),
    process_button: document.getElementById('process_button'),
    selection_summary: document.getElementById('selection_summary'),
    queue_list: document.getElementById('queue_list'),
    results_section: document.getElementById('results_section'),
    result_summary: document.getElementById('result_summary'),
    progress_label: document.getElementById('progress_label'),
    progress_value: document.getElementById('progress_value'),
    progress_bar: document.getElementById('progress_bar'),
    live_status: document.getElementById('live_status'),
    download_zip_button: document.getElementById('download_zip_button')
};

let selected_items = [];
let processed_entries = [];
let next_item_id = 1;
let is_processing = false;
let progress_label_key = 'ready_to_process';
let progress_label_replacements = {};

function format_message(key, replacements = {}) {
    let value = messages[key] || key;

    for (const [replacement_key, replacement_value] of Object.entries(replacements)) {
        value = value.replaceAll(`{${replacement_key}}`, String(replacement_value));
    }

    return value;
}

function format_bytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const unit_index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** unit_index);
    const precision = value >= 10 || unit_index === 0 ? 0 : 1;

    return `${value.toFixed(precision)} ${units[unit_index]}`;
}

function normalize_relative_path(path) {
    const normalized_segments = String(path || '')
        .replaceAll('\\', '/')
        .split('/')
        .filter((segment) => segment && segment !== '.' && segment !== '..')
        .map((segment) => segment.replace(/[\u0000-\u001f]/g, '_'));

    return normalized_segments.join('/');
}

function get_file_extension(path) {
    const file_name = path.split('/').pop() || '';
    const extension = file_name.includes('.') ? file_name.split('.').pop() : 'IMG';

    return extension.slice(0, 5).toUpperCase();
}

function is_image_file(file) {
    if (file.type.startsWith('image/')) {
        return true;
    }

    return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(file.name);
}

function get_candidate_key(candidate) {
    return `${candidate.path.toLocaleLowerCase()}\u0000${candidate.file.size}\u0000${candidate.file.lastModified}`;
}

function create_candidates_from_files(files) {
    return Array.from(files, (file) => ({
        file,
        path: normalize_relative_path(file.webkitRelativePath || file.name)
    }));
}

async function add_candidates(candidates) {
    if (is_processing) {
        return;
    }

    const existing_keys = new Set(selected_items.map((item) => item.candidate_key));
    const new_items = [];
    let ignored_count = 0;
    let duplicate_count = 0;

    for (const candidate of candidates) {
        if (!candidate.file || !is_image_file(candidate.file)) {
            ignored_count += 1;
            continue;
        }

        const normalized_candidate = {
            file: candidate.file,
            path: normalize_relative_path(candidate.path || candidate.file.name)
        };
        const candidate_key = get_candidate_key(normalized_candidate);

        if (!normalized_candidate.path || existing_keys.has(candidate_key)) {
            duplicate_count += 1;
            continue;
        }

        existing_keys.add(candidate_key);
        const item = {
            id: next_item_id,
            candidate_key,
            file: normalized_candidate.file,
            path: normalized_candidate.path,
            width: null,
            height: null,
            status: 'reading',
            error_key: null,
            result: null
        };

        next_item_id += 1;
        selected_items.push(item);
        new_items.push(item);
    }

    if (new_items.length > 0) {
        invalidate_results(false);
        elements.workspace_section.hidden = false;
        elements.import_status.textContent = format_message('files_added', { count: new_items.length });
    } else if (ignored_count > 0) {
        elements.import_status.textContent = format_message('files_ignored', { count: ignored_count });
    } else if (duplicate_count > 0) {
        elements.import_status.textContent = format_message('duplicate_files', { count: duplicate_count });
    }

    update_interface();

    for (const item of new_items) {
        if (!selected_items.includes(item)) {
            continue;
        }

        try {
            const decoded_image = await decode_image(item.file);
            item.width = decoded_image.width;
            item.height = decoded_image.height;
            item.status = 'pending';
            decoded_image.dispose();
        } catch {
            item.status = 'error';
            item.error_key = 'invalid_image';
        }

        update_interface();
    }

    if (ignored_count > 0 || duplicate_count > 0) {
        const notices = [];

        if (ignored_count > 0) {
            notices.push(format_message('files_ignored', { count: ignored_count }));
        }

        if (duplicate_count > 0) {
            notices.push(format_message('duplicate_files', { count: duplicate_count }));
        }

        elements.import_status.textContent = notices.join(' ');
    }
}

function decode_image(file) {
    if ('createImageBitmap' in window) {
        return createImageBitmap(file)
            .then((bitmap) => ({
                source: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                dispose: () => bitmap.close()
            }))
            .catch(() => decode_image_with_element(file));
    }

    return decode_image_with_element(file);
}

function decode_image_with_element(file) {
    return new Promise((resolve, reject) => {
        const object_url = URL.createObjectURL(file);
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve({
            source: image,
            width: image.naturalWidth,
            height: image.naturalHeight,
            dispose: () => URL.revokeObjectURL(object_url)
        });
        image.onerror = () => {
            URL.revokeObjectURL(object_url);
            reject(new Error('invalid_image'));
        };
        image.src = object_url;
    });
}

function get_target_dimensions(item) {
    const scale_factor = Number(elements.scale_slider.value);

    if (!item.width || !item.height) {
        return null;
    }

    return {
        width: Math.round(item.width * scale_factor),
        height: Math.round(item.height * scale_factor)
    };
}

function create_row_button(label, icon_markup, class_name, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `row_button ${class_name}`;
    button.setAttribute('aria-label', label);
    button.innerHTML = icon_markup;
    button.addEventListener('click', handler);

    return button;
}

function render_queue() {
    const fragment = document.createDocumentFragment();

    for (const item of selected_items) {
        const row = document.createElement('article');
        row.className = 'queue_item';

        const badge = document.createElement('div');
        badge.className = 'file_badge';
        badge.textContent = get_file_extension(item.path);

        const details = document.createElement('div');
        details.className = 'file_details';

        const path = document.createElement('p');
        path.className = 'file_path';
        path.textContent = item.path;
        path.title = item.path;

        const metadata = document.createElement('div');
        metadata.className = 'file_meta';

        const file_size = document.createElement('span');
        file_size.textContent = format_bytes(item.file.size);
        metadata.append(file_size);

        if (item.width && item.height) {
            const source_dimensions = document.createElement('span');
            source_dimensions.textContent = format_message('source_dimensions', { width: item.width, height: item.height });
            metadata.append(source_dimensions);

            const target = get_target_dimensions(item);
            const target_dimensions = document.createElement('span');
            target_dimensions.className = 'target_dimensions';
            target_dimensions.textContent = format_message('target_dimensions', target);
            metadata.append(target_dimensions);

            if (item.result) {
                const output_path = document.createElement('span');
                output_path.className = 'target_dimensions';
                output_path.textContent = format_message('output_path', { path: item.result.path });
                metadata.append(output_path);
            }
        } else {
            const unknown_dimensions = document.createElement('span');
            unknown_dimensions.textContent = format_message('unknown_dimensions');
            metadata.append(unknown_dimensions);
        }

        details.append(path, metadata);

        const status = document.createElement('span');
        status.className = `status_badge status_${item.status}`;
        status.textContent = format_message(item.status === 'error' ? item.error_key : item.status);

        const actions = document.createElement('div');
        actions.className = 'item_actions';

        if (item.result) {
            const download_button = create_row_button(
                format_message('download_file'),
                '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5"></path><path d="M5 21h14"></path></svg>',
                'download_button',
                () => download_result(item)
            );
            actions.append(download_button);
        }

        const remove_button = create_row_button(
            format_message('remove_file'),
            '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
            'remove_button',
            () => remove_item(item.id)
        );
        remove_button.disabled = is_processing;
        actions.append(remove_button);

        row.append(badge, details, status, actions);
        fragment.append(row);
    }

    elements.queue_list.replaceChildren(fragment);
}

function update_summaries() {
    const total_size = selected_items.reduce((total, item) => total + item.file.size, 0);
    const success_count = processed_entries.length;
    const error_count = selected_items.filter((item) => item.status === 'error').length;

    elements.selection_summary.textContent = format_message('files_summary', {
        count: selected_items.length,
        size: format_bytes(total_size)
    });
    elements.result_summary.textContent = format_message('results_summary', {
        success: success_count,
        errors: error_count
    });
}

function update_controls() {
    const has_reading_items = selected_items.some((item) => item.status === 'reading');
    const has_processable_items = selected_items.some((item) => !permanent_error_keys.has(item.error_key));
    const controls_disabled = is_processing;

    elements.file_input.disabled = controls_disabled;
    elements.drop_zone.setAttribute('aria-disabled', String(controls_disabled));
    elements.clear_button.disabled = controls_disabled;
    elements.scale_slider.disabled = controls_disabled;
    elements.loss_slider.disabled = controls_disabled;
    elements.process_button.disabled = controls_disabled || has_reading_items || !has_processable_items;
    elements.download_zip_button.disabled = controls_disabled || processed_entries.length === 0;
}

function update_interface() {
    elements.workspace_section.hidden = selected_items.length === 0;
    elements.scale_value.textContent = `×${elements.scale_slider.value}`;
    elements.loss_value.textContent = `${elements.loss_slider.value}%`;
    render_queue();
    update_summaries();
    update_controls();
}

function invalidate_results(show_notice = true) {
    if (processed_entries.length === 0 && !selected_items.some((item) => item.result)) {
        return;
    }

    processed_entries = [];

    for (const item of selected_items) {
        item.result = null;

        if (!permanent_error_keys.has(item.error_key)) {
            item.status = item.width && item.height ? 'pending' : 'reading';
            item.error_key = null;
        }
    }

    elements.results_section.hidden = true;
    elements.progress_bar.value = 0;
    elements.progress_value.textContent = '0%';
    progress_label_key = 'ready_to_process';
    progress_label_replacements = {};
    elements.progress_label.textContent = format_message('ready_to_process');

    if (show_notice) {
        elements.live_status.textContent = format_message('settings_changed');
    }
}

function remove_item(item_id) {
    if (is_processing) {
        return;
    }

    selected_items = selected_items.filter((item) => item.id !== item_id);
    processed_entries = processed_entries.filter((entry) => entry.item_id !== item_id);

    if (selected_items.length === 0) {
        clear_selection();
        return;
    }

    if (processed_entries.length === 0) {
        elements.results_section.hidden = true;
    }

    update_interface();
}

function clear_selection() {
    if (is_processing) {
        return;
    }

    selected_items = [];
    processed_entries = [];
    elements.file_input.value = '';
    elements.workspace_section.hidden = true;
    elements.results_section.hidden = true;
    elements.progress_bar.value = 0;
    elements.progress_value.textContent = '0%';
    progress_label_key = 'ready_to_process';
    progress_label_replacements = {};
    elements.progress_label.textContent = format_message('ready_to_process');
    elements.import_status.textContent = '';
    elements.live_status.textContent = '';
    update_interface();
}

function create_output_path(source_path, scale_factor, used_paths) {
    const segments = normalize_relative_path(source_path).split('/');
    const file_name = segments.pop() || 'image';
    const extension_index = file_name.lastIndexOf('.');
    const base_name = extension_index > 0 ? file_name.slice(0, extension_index) : file_name;
    const directory = segments.length > 0 ? `${segments.join('/')}/` : '';
    const base_output_name = `${base_name}_redimensionnee_x${scale_factor}`;
    let output_path = `${directory}${base_output_name}.png`;
    let duplicate_index = 2;

    while (used_paths.has(output_path.toLocaleLowerCase())) {
        output_path = `${directory}${base_output_name}_${duplicate_index}.png`;
        duplicate_index += 1;
    }

    used_paths.add(output_path.toLocaleLowerCase());

    return output_path;
}

function canvas_to_blob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('processing_error'));
            }
        }, 'image/png');
    });
}

async function resize_image(item, scale_factor, loss_percent) {
    const decoded_image = await decode_image(item.file);
    let result_canvas = null;
    let shrink_canvas = null;

    try {
        const target_width = Math.round(decoded_image.width * scale_factor);
        const target_height = Math.round(decoded_image.height * scale_factor);
        const target_pixels = target_width * target_height;

        if (
            target_width < 1 ||
            target_height < 1 ||
            target_width > maximum_canvas_dimension ||
            target_height > maximum_canvas_dimension ||
            target_pixels > maximum_output_pixels
        ) {
            throw new Error('output_too_large');
        }

        result_canvas = document.createElement('canvas');
        result_canvas.width = target_width;
        result_canvas.height = target_height;
        const result_context = result_canvas.getContext('2d', { alpha: true });

        if (!result_context) {
            throw new Error('processing_error');
        }

        result_context.imageSmoothingEnabled = false;
        result_context.drawImage(decoded_image.source, 0, 0, target_width, target_height);

        if (loss_percent > 0) {
            const shrink_factor = 1 - (loss_percent / 100);
            const shrink_width = Math.max(1, Math.floor(target_width * shrink_factor));
            const shrink_height = Math.max(1, Math.floor(target_height * shrink_factor));

            shrink_canvas = document.createElement('canvas');
            shrink_canvas.width = shrink_width;
            shrink_canvas.height = shrink_height;
            const shrink_context = shrink_canvas.getContext('2d', { alpha: true });

            if (!shrink_context) {
                throw new Error('processing_error');
            }

            shrink_context.imageSmoothingEnabled = true;
            shrink_context.imageSmoothingQuality = 'high';
            shrink_context.drawImage(result_canvas, 0, 0, shrink_width, shrink_height);
            result_context.clearRect(0, 0, target_width, target_height);
            result_context.imageSmoothingEnabled = true;
            result_context.imageSmoothingQuality = 'high';
            result_context.drawImage(shrink_canvas, 0, 0, shrink_width, shrink_height, 0, 0, target_width, target_height);
        }

        const blob = await canvas_to_blob(result_canvas);

        return {
            blob,
            width: target_width,
            height: target_height
        };
    } finally {
        decoded_image.dispose();

        if (result_canvas) {
            result_canvas.width = 1;
            result_canvas.height = 1;
        }

        if (shrink_canvas) {
            shrink_canvas.width = 1;
            shrink_canvas.height = 1;
        }
    }
}

function update_progress(completed_count, total_count, label_key, replacements = {}) {
    const percentage = total_count > 0 ? Math.round((completed_count / total_count) * 100) : 0;
    elements.progress_bar.value = percentage;
    elements.progress_bar.textContent = `${percentage}%`;
    elements.progress_value.textContent = `${percentage}%`;
    progress_label_key = label_key;
    progress_label_replacements = replacements;
    elements.progress_label.textContent = format_message(label_key, replacements);
}

async function process_batch() {
    if (is_processing) {
        return;
    }

    const processable_items = selected_items.filter((item) => !permanent_error_keys.has(item.error_key));

    if (processable_items.length === 0) {
        elements.live_status.textContent = format_message('empty_selection');
        return;
    }

    processed_entries = [];
    const scale_factor = Number(elements.scale_slider.value);
    const loss_percent = Number(elements.loss_slider.value);
    const used_paths = new Set();
    let completed_count = 0;
    let success_count = 0;

    for (const item of processable_items) {
        item.result = null;
        item.status = 'pending';
        item.error_key = null;
    }

    is_processing = true;
    elements.results_section.hidden = false;
    elements.live_status.textContent = '';
    update_progress(0, processable_items.length, 'ready_to_process');
    update_interface();
    elements.results_section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    for (const item of processable_items) {
        item.status = 'processing';
        update_progress(completed_count, processable_items.length, 'processing_file', { name: item.path });
        update_interface();

        try {
            const resized_image = await resize_image(item, scale_factor, loss_percent);
            const output_path = create_output_path(item.path, scale_factor, used_paths);
            item.result = {
                blob: resized_image.blob,
                path: output_path,
                width: resized_image.width,
                height: resized_image.height
            };
            item.status = 'ready';
            processed_entries.push({
                item_id: item.id,
                path: output_path,
                blob: resized_image.blob,
                date: new Date(item.file.lastModified || Date.now())
            });
            success_count += 1;
        } catch (error) {
            item.status = 'error';
            item.error_key = error instanceof Error && error.message === 'output_too_large' ? 'output_too_large' : 'processing_error';
        }

        completed_count += 1;
        update_progress(completed_count, processable_items.length, completed_count === processable_items.length ? 'processing_complete' : 'processing_file', {
            name: item.path
        });
        update_interface();
    }

    const error_count = selected_items.filter((item) => item.status === 'error').length;
    is_processing = false;
    update_progress(processable_items.length, processable_items.length, success_count > 0 ? 'processing_complete' : 'processing_failed');
    elements.live_status.textContent = format_message('processed_summary', { success: success_count, errors: error_count });
    update_interface();
}

function trigger_download(blob, file_name) {
    const object_url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = object_url;
    link.download = file_name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(object_url), 1000);
}

function download_result(item) {
    if (!item.result) {
        return;
    }

    const file_name = item.result.path.split('/').pop() || 'image_redimensionnee.png';
    trigger_download(item.result.blob, file_name);
}

async function download_zip() {
    if (processed_entries.length === 0 || is_processing) {
        return;
    }

    const button_label = elements.download_zip_button.querySelector('span');
    elements.download_zip_button.disabled = true;
    button_label.textContent = format_message('creating_zip');

    try {
        const archive_blob = await create_zip_archive(processed_entries);
        const date_stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '_');
        const archive_name = `images_redimensionnees_x${elements.scale_slider.value}_${date_stamp}.zip`;
        trigger_download(archive_blob, archive_name);
        elements.live_status.textContent = format_message('archive_ready');
    } catch (error) {
        const error_key = error instanceof Error && error.message === 'archive_too_large' ? 'archive_too_large' : 'archive_error';
        elements.live_status.textContent = format_message(error_key);
    } finally {
        button_label.textContent = format_message('download_zip');
        elements.download_zip_button.disabled = processed_entries.length === 0;
    }
}

function read_directory_entries(directory_entry, parent_path) {
    return new Promise((resolve, reject) => {
        const reader = directory_entry.createReader();
        const entries = [];

        function read_batch() {
            reader.readEntries((batch) => {
                if (batch.length === 0) {
                    resolve(entries);
                    return;
                }

                entries.push(...batch);
                read_batch();
            }, reject);
        }

        read_batch();
    }).then(async (entries) => {
        const candidates = [];

        for (const entry of entries) {
            candidates.push(...await read_drop_entry(entry, `${parent_path}${directory_entry.name}/`));
        }

        return candidates;
    });
}

function read_file_entry(file_entry, parent_path) {
    return new Promise((resolve, reject) => {
        file_entry.file((file) => resolve([{
            file,
            path: normalize_relative_path(`${parent_path}${file_entry.name}`)
        }]), reject);
    });
}

function read_drop_entry(entry, parent_path = '') {
    if (entry.isFile) {
        return read_file_entry(entry, parent_path);
    }

    if (entry.isDirectory) {
        return read_directory_entries(entry, parent_path);
    }

    return Promise.resolve([]);
}

async function collect_drop_candidates(data_transfer) {
    const transfer_items = Array.from(data_transfer.items || []);
    const entries = transfer_items
        .map((item) => typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null)
        .filter(Boolean);

    if (entries.length === 0) {
        return create_candidates_from_files(data_transfer.files || []);
    }

    const candidates = [];

    for (const entry of entries) {
        candidates.push(...await read_drop_entry(entry));
    }

    return candidates;
}

function bind_events() {
    elements.file_input.addEventListener('change', async (event) => {
        const candidates = create_candidates_from_files(event.target.files || []);
        event.target.value = '';
        await add_candidates(candidates);
    });

    elements.scale_slider.addEventListener('input', () => {
        invalidate_results();
        update_interface();
    });

    elements.loss_slider.addEventListener('input', () => {
        invalidate_results();
        update_interface();
    });

    elements.clear_button.addEventListener('click', clear_selection);
    elements.process_button.addEventListener('click', process_batch);
    elements.download_zip_button.addEventListener('click', download_zip);

    elements.drop_zone.addEventListener('click', () => {
        if (!is_processing) {
            elements.file_input.click();
        }
    });

    for (const event_name of ['dragenter', 'dragover']) {
        elements.drop_zone.addEventListener(event_name, (event) => {
            event.preventDefault();

            if (!is_processing) {
                elements.drop_zone.classList.add('dragging');
            }
        });
    }

    elements.drop_zone.addEventListener('dragleave', (event) => {
        if (!elements.drop_zone.contains(event.relatedTarget)) {
            elements.drop_zone.classList.remove('dragging');
        }
    });

    elements.drop_zone.addEventListener('drop', async (event) => {
        event.preventDefault();
        elements.drop_zone.classList.remove('dragging');

        if (is_processing) {
            return;
        }

        const candidates = await collect_drop_candidates(event.dataTransfer);
        await add_candidates(candidates);
    });
}

function initialize() {
    bind_events();
    update_interface();
}

initialize();
