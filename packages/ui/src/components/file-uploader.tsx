import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { File, Image } from 'react-feather';

import type { ResourceType } from '@oyster/core/resources';
import type { FieldProps } from '@oyster/ui';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit in bytes
const FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

export function FileUploader({ name }: FieldProps<ResourceType>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isHover, setisHover] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > MAX_FILE_SIZE && !FILE_TYPES.includes(file.type)) {
      setFileError(
        `File size exceeds 20 MB limit and File type not supported.`
      );
      setSelectedFile(null);
    } else if (file.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds 20 MB limit.`);
      setSelectedFile(null);
    } else if (!FILE_TYPES.includes(file.type)) {
      setFileError(`File type not supported.`);
      setSelectedFile(null);
    } else {
      setFileError(null);
      setSelectedFile(file);
    }
  };

  const formatFileSize = (size: number): string => {
    const units = ['B', 'KB', 'MB'];
    let i = 0;

    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i += 1;
    }

    return `${size.toFixed(0)}${units[i]}`;
  };

  return (
    <div>
      <label
        htmlFor={name}
        onDragOver={(e) => {
          e.preventDefault();
          setisHover(true);
        }}
        onDragLeave={() => setisHover(false)}
        onDrop={() => setisHover(false)}
        className={`relative flex flex-col items-center rounded-3xl border-2 border-dashed transition-all duration-300 ease-in-out ${
          isHover
            ? 'cursor-grab border-primary'
            : 'border-gray-300 hover:cursor-grab hover:border-primary'
        }`}
      >
        <div className="flex flex-col items-center p-4">
          <div className="bg- mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 p-3">
            <Image className="h-8 w-8 text-primary" />
          </div>

          <p className="text-center font-normal">
            <span className="cursor-pointer font-bold text-primary hover:underline">
              Click here
            </span>{' '}
            or drag and drop to upload your file.
          </p>
        </div>

        <input
          id={name}
          name={name}
          type="file"
          accept="image/png, image/jpeg, .pdf"
          className="absolute top-0 z-10 h-full w-full rounded-3xl opacity-0 hover:cursor-grab"
          required
          onChange={handleFileChange}
        />
      </label>

      {fileError && <p className="mb-1 text-sm text-red-500">*{fileError}</p>}

      {selectedFile && (
        <div className="flex items-center rounded-md bg-white p-2 shadow-sm">
          <File className="mr-2 h-6 w-6 text-primary" />
          <div>
            <p className="break-words font-medium text-gray-800">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(selectedFile.size)}{' '}
              <span className="font-medium">
                {selectedFile.type.split('/')[1].toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
