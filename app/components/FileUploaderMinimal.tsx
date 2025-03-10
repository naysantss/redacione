'use client';

import { FileUploaderMinimal as Uploader } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';

interface FileInfo {
  cdnUrl: string;
}

interface FileUploaderMinimalProps {
  pubkey: string;
  multiple?: boolean;
  imgOnly?: boolean;
  classNameUploader?: string;
  onChange: (info: { cdnUrl: string }) => void;
}

export default function FileUploaderMinimal({
  pubkey,
  multiple = false,
  imgOnly = false,
  classNameUploader = 'uc-light uc-purple',
  onChange
}: FileUploaderMinimalProps) {
  return (
    <Uploader
      pubkey={pubkey}
      multiple={multiple}
      imgOnly={imgOnly}
      className={classNameUploader}
      onChange={(info: any) => {
        if (info.successEntries?.[0]?.cdnUrl) {
          onChange({ cdnUrl: info.successEntries[0].cdnUrl });
        }
      }}
    />
  );
} 