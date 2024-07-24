import { useRef, useState } from 'react';
import { type ChangeEvent, type HTMLProps } from 'react';
import { File, UploadCloud, X } from 'react-feather';

import { iife } from '@oyster/utils';

import { IconButton } from './icon-button';
import { Text } from './text';
import { cx } from '../utils/cx';

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (in bytes)

type MimeType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'text/csv';

type FileMetadata = Pick<File, 'name' | 'size' | 'type'> &
  Partial<{ id: string }>;

type FileUploaderProps = Pick<
  HTMLProps<HTMLInputElement>,
  'id' | 'name' | 'required'
> & {
  accept: MimeType[];
  initialFile?: FileMetadata;
  maxFileSize?: number;
};

export function FileUploader({
  accept,
  id,
  initialFile,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  name,
  required,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(
    initialFile || null
  );

  const [error, setError] = useState<string | null>(null);
  const [isDragged, setIsDragged] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const formattedMaxSize = formatFileSize(maxFileSize);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
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
    <div className="flex flex-col gap-4">
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

          {iife(() => {
            const formattedAccept = accept
              .map(formatFileType)
              .sort()
              .join(', ');

            return (
              <Text color="gray-500" variant="sm">
                {formattedAccept} (Max Size: {formattedMaxSize})
              </Text>
            );
          })}
        </div>

        <input
          accept={accept.join(', ')}
          className="absolute top-0 h-full w-full cursor-grab rounded-3xl opacity-0"
          id={id}
          name={name}
          onChange={onFileChange}
          onDragLeave={(_) => setIsDragged(false)}
          onDragOver={(_) => setIsDragged(true)}
          onDrop={(_) => setIsDragged(false)}
          ref={inputRef}
          type="file"
          {...(!selectedFile && { required })}
        />

        {
          // Since the native <input type="file" /> doesn't support a default
          // value or controlled value, we need to somehow keep track of a
          // file that was already uploaded (ie: in the "edit" workflows). We'll
          // use a hidden input that sends that file's ID to the server.
          <input name={name} type="hidden" value={selectedFile?.id || ''} />
        }
      </div>

      {error && <Text color="error">{error}</Text>}

      {selectedFile && (
        <div className="flex items-center gap-2 rounded-lg bg-primary bg-opacity-5 p-2">
          <File className="h-6 w-6 text-primary" />

          <div>
            <Text className="line-clamp-1" weight="500">
              {selectedFile.name}
            </Text>

            <Text color="gray-500" variant="xs">
              <span>{formatFileType(selectedFile.type)}</span>

              {!!selectedFile.size && (
                // We'll only display the file size if it's not empty...this
                // handles the case in which we don't have the file size.
                <span> | {formatFileSize(selectedFile.size)}</span>
              )}
            </Text>
          </div>

          <IconButton
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            className="ml-auto"
            icon={<X />}
            label="Remove file."
            onClick={() => {
              // The input value is not controlled, so we need to reset it
              // manually using it's ref.
              inputRef.current!.value = '';

              setSelectedFile(null);
              setError(null);
            }}
          />
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

function formatFileType(mimeType: string) {
  return mimeType.split('/')[1].toUpperCase();
}
