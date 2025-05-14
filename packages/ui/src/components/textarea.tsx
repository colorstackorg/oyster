import { useState } from 'react';
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from 'react-textarea-autosize';

import { getInputCn } from './input';
import { Text } from './text';
import { cx } from '../utils/cx';

type TextareaProps = Pick<
  TextareaAutosizeProps,
  | 'children'
  | 'defaultValue'
  | 'id'
  | 'maxLength'
  | 'minLength'
  | 'minRows'
  | 'name'
  | 'onBlur'
  | 'placeholder'
  | 'readOnly'
  | 'required'
  | 'value'
>;

const className = cx(getInputCn(), 'resize-none');

export function Textarea({
  maxLength,
  minLength,
  minRows = 3,
  ...rest
}: TextareaProps) {
  if (maxLength) {
    return (
      <TextareaWithMaximum
        maxLength={maxLength}
        minLength={minLength}
        minRows={minRows}
        {...rest}
      />
    );
  }

  if (minLength) {
    return (
      <TextareaWithMinimum
        maxLength={maxLength}
        minLength={minLength}
        minRows={minRows}
        {...rest}
      />
    );
  }

  return (
    <TextareaAutosize
      className={className}
      maxLength={maxLength}
      minRows={minRows}
      {...rest}
    />
  );
}

function TextareaWithMaximum({
  defaultValue,
  minRows,
  maxLength,
  ...rest
}: TextareaProps) {
  const [value, setValue] = useState<string>(defaultValue?.toString() || '');

  return (
    <>
      <TextareaAutosize
        className={className}
        defaultValue={defaultValue}
        maxLength={maxLength}
        minRows={minRows}
        onChange={(e) => setValue(e.target.value)}
        {...rest}
      />

      <Text className="text-right" color="gray-500" variant="sm">
        {value.length}/{maxLength}
      </Text>
    </>
  );
}

function TextareaWithMinimum({
  defaultValue,
  minLength = 0,
  ...rest
}: TextareaProps) {
  const [value, setValue] = useState<string>(defaultValue?.toString() || '');

  return (
    <>
      <TextareaAutosize
        className={className}
        defaultValue={defaultValue}
        minLength={minLength}
        onChange={(e) => setValue(e.target.value)}
        {...rest}
      />

      {value.length < minLength && (
        <Text className="text-right" color="gray-500" variant="sm">
          {minLength - value.length} more characters required.
        </Text>
      )}
    </>
  );
}
