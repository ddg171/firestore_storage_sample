'use strict';
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
const functions = require('firebase-functions');
const mkdirp = require('mkdirp');
const admin = require('firebase-admin');
admin.initializeApp();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');

const ffmpeg= require('fluent-ffmpeg');
const ffmpeg_static = require('ffmpeg-static');
const ffprobe_static = require('ffprobe-static');

ffmpeg.setFfmpegPath(ffmpeg_static);
ffmpeg.setFfprobePath(ffprobe_static.path);

// 静止画サムネイルのパラメータ
const THUMB_MAX_HEIGHT = 600;
const THUMB_MAX_WIDTH = 600;
// Thumbnail prefix added to file names.
const THUMB_PREFIX = 'thumb_';
const THUMB_DIR = 'thumb'

const DEFAULT_BUCKET ='learn-to-firebase.appspot.com'


function deleteFile(path,bucket){
  admin.storage().bucket(bucket).file(path).delete().then(()=>{
    console.log("deleteFile")
  }).catch(e=>{
    console.log(e)
  })
}

// 投稿されたファイルのドキュメントを作成する関数
async function createFileDocument(uid,filePath,contentType, parentPath){
  const parentRef = admin.firestore().doc(parentPath)
  return await admin.firestore().collection('file').add({
    uid,
    filePath,
    parentRef,
    contentType,
    thumbPath:null,
    createdDate:admin.firestore.FieldValue.serverTimestamp()
  }).catch(e=>{
    console.log(e)
    return null
  })
}

async function updateThumbInfo(dataRef,filePath){
  dataRef.update({
    thumbPath:filePath,
    updatedDate:admin.firestore.FieldValue.serverTimestamp()
  }).then(()=>{
    console.log('サムネイル情報を登録')
  })
}

// ドキュメントの存在確認関数
async function checkDocExist(parentPath){
  if(!parentPath) return false
  return await admin.firestore().doc(parentPath).get().then(doc=>{
    return doc.exists
  }).catch(()=>{
    return false
  })


}

// 静止画用サムネイル画像生成関数
async function generateImageThumbnail(filePath,bucketName,contentType,customMetaData,thumbHeight,thumbWidth,thumbPrefix,thumbDir){
  const fileName = path.basename(filePath)
  const thumbFilePath = path.join(`${thumbDir}`,`${thumbPrefix}${fileName}`)
  const tempLocalFile = path.join(os.tmpdir(), filePath)
  const tempLocalDir = path.dirname(tempLocalFile)
  const tempLocalThumbFile = path.join(tempLocalDir,`${thumbPrefix}${fileName}`)
  const bucket = admin.storage().bucket(bucketName)
  const file = bucket.file(filePath)

  const metadata = {
    contentType,
    metadata:customMetaData
  }

  // Create the temp directory where the storage file will be downloaded.
  await mkdirp(tempLocalDir)

  // Download file from bucket.
  await file.download({ destination: tempLocalFile })
  console.log('画像をダウンロード: ', tempLocalFile)
  // Generate a thumbnail using ImageMagick.
  await spawn('convert',[tempLocalFile, '-thumbnail', `${thumbWidth}x${thumbHeight}>`, tempLocalThumbFile], { capture: ['stdout', 'stderr'] })
  console.log('サムネイル画像を生成: ', tempLocalThumbFile)
  // Uploading the Thumbnail.
  await bucket.upload(tempLocalThumbFile, { destination: thumbFilePath, metadata })
  console.log('サムネイル画像をアップロード: ', thumbFilePath)
  // Once the image has been uploaded delete the local files to free up disk space.
  fs.unlinkSync(tempLocalFile)
  fs.unlinkSync(tempLocalThumbFile)
  // Get the Signed URLs for the thumbnail and original image.
  return thumbFilePath || null

}

// 動画用サムネイル画像生成関数
async function generateVideoThumbnail(filePath,bucketName,customMetaData,thumbWidth,thumbHeight,thumbPrefix,thumbDir){
  // cloudstrage側の元ファイルのパス
  const videoPath =filePath
  // 元ファイルのファイル名
  const videoName =path.basename(filePath)
  const videoNameArray=videoName.split('.')
  //const len = videoNameArray.length
  // 元ファイルのディレクトリ
  const videoDir =path.dirname(filePath)
  // サムネのファイル名を作成
  // 拡張子が変わる
  const thumbNameTemp =[...videoNameArray.slice(0,-1),'jpg'].join('.')
  const thumbName = `${thumbPrefix}${thumbNameTemp}`
  // cloud storage側のサムネのパス
  const thumbPath = path.join(thumbDir,thumbName)
  // cloud functionの一時フォルダのパス
  const tempDir =path.join(os.tmpdir(),videoDir)
  // 一時フォルダ側の元ファイルのパス
  const tempVideoPath =path.join(tempDir,videoName)
  // サムネ
  const tempTumbPath = path.join(tempDir,thumbName)
  const bucket = admin.storage().bucket(bucketName)
  const file = bucket.file(videoPath)
  // サムネイル用メタデータ
  const metadata = {
    contentType:'image/jpeg',
    metadata:customMetaData
  }
  // 一時フォルダを作成
  await mkdirp(tempDir)

  // Download file from bucket.
  await file.download({ destination: tempVideoPath })
  console.log('動画をダウンロード: ', tempVideoPath)
  // Generate a thumbnail using ImageMagick.
  return new Promise((resolve,reject)=>{
    ffmpeg(tempVideoPath).on('start',()=>{
      console.log('start ffmpeg')
    }).on('end',async ()=>{
      console.log('サムネイル画像を生成: ', tempTumbPath)
      await spawn('convert',[tempTumbPath, '-thumbnail', `${thumbWidth}x${thumbHeight}>`, tempTumbPath], { capture: ['stdout', 'stderr'] })
      // Uploading the Thumbnail.
      await bucket.upload(tempTumbPath, { destination: thumbPath, metadata })
        console.log('サムネイル画像をアップロード: ', thumbPath)
        fs.existsSync(tempVideoPath)?fs.unlinkSync(tempVideoPath):null
        fs.existsSync(tempTumbPath)?fs.unlinkSync(tempTumbPath):null

      resolve(thumbPath)
      }).on('error',(e)=>{
        console.log("動画サムネイル生成に失敗",e)
        fs.existsSync(tempVideoPath)?fs.unlinkSync(tempVideoPath):null
        fs.existsSync(tempTumbPath)?fs.unlinkSync(tempTumbPath):null
        reject(null)
      }).screenshots({
        timestamps: [1],
        filename: thumbName,
        folder: tempDir
    })
  })
  }


// storageトリガー
// 無限ループに注意
const storageTrrigerOption={
  timeoutSeconds: 360,
  memory: '1GB'
}
exports.storageTrriger = functions.runWith(storageTrrigerOption).storage.object().onFinalize(async (object) => {
  const filePath = object.name
  const bucketName =object.bucket
  const fileDir = path.dirname(filePath)
  const fileName = path.basename(filePath)
  const contentType = object.contentType // This is the image MIME type
  const customMetaData = object.metadata || null
  console.log(object)
  // 親ドキュメントの情報が存在しない場合はファイルを削除して終了。
  if(!customMetaData || !customMetaData.parentPath){
    deleteFile(filePath,bucketName)
    return 0
  }
  // 実在しない親ドキュメントの場合も削除
  const isParentDocExist = await checkDocExist(customMetaData.parentPath)
  if(!isParentDocExist){
    deleteFile(filePath,bucketName)
    return 0
  }
  // サムネのprefixで始まる名前のファイルがサムネフォルダ以外にアップロードされた場合は削除
  if(fileName.startsWith(THUMB_PREFIX) &&fileDir.indexOf(THUMB_DIR)<0){
    console.log('ファイル名制限')
    deleteFile(filePath,bucketName)
    return 0
  }
  // 通常のサムネイル画像のガード節
  if(fileName.startsWith(THUMB_PREFIX)){
    return 0
  }
  // 投稿されたファイル情報をFirestoreに登録
  console.log("登録処理")
  const dataRef = await createFileDocument(customMetaData.uid,filePath,contentType, customMetaData.parentPath , customMetaData.isThumb || false)
  // 画像かつサムネイル画像でないならサムネイル作成処理を行う
  if(contentType.startsWith('image/') ){
    console.log("静止画サムネイル生成開始")
    const thumbPath = await generateImageThumbnail(filePath,bucketName,contentType,customMetaData,THUMB_MAX_HEIGHT,THUMB_MAX_WIDTH,THUMB_PREFIX,THUMB_DIR)
    console.log("ImageThumbPath:",thumbPath)
    thumbPath? updateThumbInfo(dataRef,thumbPath):null
  }
  if(contentType.startsWith('video/mp4')){
    console.log("動画サムネイル生成開始")
    const thumbPath = await generateVideoThumbnail(filePath,bucketName,customMetaData,THUMB_MAX_HEIGHT,THUMB_MAX_WIDTH,THUMB_PREFIX,THUMB_DIR)
    console.log("videoThumbPath:",thumbPath)
    thumbPath? updateThumbInfo(dataRef,thumbPath):null
  }
  return 0
})

// fileコレクションのトリガー
exports.fileCreated=functions.firestore
  .document('file/{fileId}')
  .onCreate((snapshot, _context) => {
    const fileRef =snapshot.ref
    const data =snapshot.data()
    const parentRef =data.parentRef

    parentRef.update({
      files:admin.firestore.FieldValue.arrayUnion(fileRef),
      updatedDate:admin.firestore.FieldValue.serverTimestamp()
    })
    return 0
  })

exports.fileDeleted=functions.firestore
  .document('file/{fileId}')
  .onDelete((snapshot, _context) => {
    const fileRef =snapshot.ref
    const data =snapshot.data()

    // まずファイルとサムネを削除
    deleteFile(data.filePath,DEFAULT_BUCKET)
    if(data.thumbPath){
      deleteFile(data.thumbPath,DEFAULT_BUCKET)
    }
    // 親ドキュメントから添付ファイル情報を削除
    data.parentRef.update({
      files:admin.firestore.FieldValue.arrayRemove(fileRef),
      updatedDate:admin.firestore.FieldValue.serverTimestamp()
    }).then(()=>{
      console.log('files_info_updated')
    }).catch(e=>{
      console.log(e)
    })
    return 0
  })