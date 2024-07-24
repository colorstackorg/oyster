import { useState } from 'react';
import { type ChangeEvent, type HTMLProps } from 'react';
import { File, UploadCloud } from 'react-feather';

import { Text } from './text';
import { cx } from '../utils/cx';

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (in bytes)

const FORMATTED_FILE_EXTENSIONS: Record<FileExtension, string> = {
  '.csv': 'CSV',
  '.jpeg': 'JPG',
  '.pdf': 'PDF',
  '.png': 'PNG',
};

type FileExtension = '.csv' | '.jpeg' | '.pdf' | '.png';

type FileUploaderProps = Pick<
  HTMLProps<HTMLInputElement>,
  'id' | 'name' | 'required'
> & {
  accept: FileExtension[];
  maxFileSize?: number;
};

export function FileUploader({
  accept,
  id,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  name,
  required,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragged, setIsDragged] = useState(false);

  const formattedMaxSize = formatFileSize(maxFileSize);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > maxFileSize) {
      setError(`File size exceeds ${formattedMaxSize} limit.`);
      setSelectedFile(null);
    } else {
      setError(null);
      setSelectedFile(file);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cx(
          'relative cursor-grab rounded-3xl border-2 border-dashed border-gray-300',
          'transition-colors duration-300 ease-in-out',
          'hover:border-primary',
          isDragged && 'border-primary'
        )}
      >
        <div className="flex flex-col items-center gap-1 p-4">
          <div className="mb-2 rounded-full bg-green-50 p-3">
            <UploadCloud className="h-8 w-8 text-primary" />
          </div>

          <Text>
            Drag and drop or{' '}
            <span className="font-bold text-primary">browse</span> to upload
            your file.
          </Text>

          <Text color="gray-500" variant="sm">
            {accept.map((type) => FORMATTED_FILE_EXTENSIONS[type]).join(', ')}{' '}
            (Max Size: {formattedMaxSize})
          </Text>
        </div>

        <input
          accept={accept.join(', ')}
          className="absolute top-0 h-full w-full cursor-grab rounded-3xl opacity-0"
          id={id}
          name={name}
          onChange={handleFileChange}
          onDragLeave={(_) => setIsDragged(false)}
          onDragOver={(_) => setIsDragged(true)}
          onDrop={(_) => setIsDragged(false)}
          required={required}
          type="file"
        />
      </div>

      {error && <p className="mb-1 text-sm text-red-500">*{error}</p>}

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

function formatFileSize(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB'];

  let i = 0;

  while (bytes >= 1024 && i < units.length - 1) {
    bytes = bytes / 1024;
    i += 1;
  }

  const size = bytes.toFixed(0);
  const unit = units[i];

  return `${size} ${unit}`;
}
