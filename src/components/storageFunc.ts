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
  const splitName: string[] = file.name.split('.');
  const extention: string =
    splitName.length > 1 && splitName[0] ? `.${splitName[1]}` : '';
  const type: string = file.type;
  const newRef = storage
    .ref()
    .child(`${storagePath}${prefix}${uid}${extention}`);
  newRef
    .put(file, { contentType: type, customMetadata: { uid, parentPath } })
    .catch((e: unknown) => {
      console.log(e);
    });
}
