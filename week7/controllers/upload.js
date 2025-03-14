const formidable = require('formidable');
const supabase = require('../config/supabase');
const config = require('../config/index');
const logger = require('../utils/logger')('UploadController');
const appError = require('../utils/appError');

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = {
  'image/jpeg': true,
  'image/png': true,
};
const BUCKET_NAME = config.get('secret').supabase.storageBucket;

async function postUploadImage(req, res, next) {
  const form = formidable.formidable({
    multiple: false,
    maxFileSize: MAX_FILE_SIZE,
    filter: ({ mimetype }) => {
      return !!ALLOWED_FILE_TYPES[mimetype]; // 只允許 JPEG、PNG
    },
  });

  form.on('error', (err) => {
    logger.error('Upload failed:', err.message);
    return next(appError(400, '檔案超過 2MB'));
  });

  const [fields, files] = await form.parse(req);
  logger.info('files', files);
  logger.info('fields', fields);

  if (!files.file || files.file.length === 0) {
    logger.warn('未上傳檔案或格式不符');
    return next(appError(400, '未上傳檔案或格式不符'));
  }

  const file = files.file[0];
  if (!ALLOWED_FILE_TYPES[file.mimetype]) {
    logger.warn(`不支援的檔案類型: ${file.mimetype}`);
    return next(appError(400, '只支援 JPEG、PNG 格式'));
  }

  const filePath = file.filepath;
  const remoteFilePath = `images/${Date.now()}-${file.originalFilename}`;

  // 讀取檔案內容
  const fs = require('fs');
  const fileBuffer = fs.readFileSync(filePath);

  const { data: buckets, error: listBucketError } =
    await supabase.storage.listBuckets();
  if (listBucketError) {
    console.error('Error fetching buckets:', listBucketError);
  } else {
    console.log('Available buckets:', buckets);
  }

  // 檢查 bucket 是否存在
  const { data: bucketExists, error: bucketError } = await supabase.storage
    .getBucket(BUCKET_NAME);

  if (bucketError) {
    logger.error('Bucket 錯誤:', bucketError);
    return next(appError(500, '儲存服務暫時無法使用'));
  }

  // 上傳至 Supabase Storage
  const { data, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(remoteFilePath, fileBuffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    logger.error('上傳錯誤:', uploadError);
    return next(appError(500, '檔案上傳失敗'));
  }

  // 取得公開 URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(remoteFilePath);

  const publicURL = urlData.publicUrl;
  logger.info('Uploaded Image URL:', publicURL);

  // 清理暫存檔案
  fs.unlinkSync(filePath);

  res.status(200).json({
    status: 'success',
    data: {
      image_url: publicURL,
    },
  });
}

module.exports = {
  postUploadImage,
};
