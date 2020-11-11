
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

// 
const THUMB_MAX_HEIGHT = 300;
const THUMB_MAX_WIDTH = 300;
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
    thumbPath:filePath
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

// サムネイル画像生成関数
async function generateThumbnail(filePath,bucketName,contentType,customMetaData,thumbHeight,thumbWidth,thumbPrefix,thumbDir){
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

// storageトリガー
// 無限ループに注意
exports.storageTrriger = functions.storage.object().onFinalize(async (object) => {
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
    console.log("サムネイル生成")
    const thumbPath = await generateThumbnail(filePath,bucketName,contentType,customMetaData,THUMB_MAX_HEIGHT,THUMB_MAX_WIDTH,THUMB_PREFIX,THUMB_DIR)
    thumbPath? updateThumbInfo(dataRef,thumbPath):null
  }
  return 0
})

// fileコレクションのトリガー
exports.fileCreated=functions.firestore
  .document('file/{fileId}')
  .onCreate((snapshot, context) => {
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