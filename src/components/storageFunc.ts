import { storage } from './firebase';
export function uploadFile(
  file: File,
  uid: string | null,
  parentPath: string,
  prefix = '',
  storagePath = 'file/'
): void {
  if (!file) return;
  if (!uid) return;
  if (!parentPath) return;
  const originalName: string = file.name || 'no_name';
  const splitName: string[] = file.name.split('.');
  const extention: string =
    splitName.length > 1 && splitName[0] ? `.${splitName[1]}` : '';
  const newName = `${prefix}${uid}${extention}`;
  const type: string = file.type;
  const newRef = storage.ref().child(`${storagePath}${newName}`);
  newRef
    .put(file, {
      contentType: type,
      customMetadata: { uid, parentPath, originalName },
    })
    .then(() => {
      console.log('put:', newRef);
    })
    .catch((e: unknown) => {
      console.log(e);
    });
}
