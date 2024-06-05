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
  | 'minRows'
  | 'name'
  | 'onBlur'
  | 'placeholder'
  | 'readOnly'
  | 'required'
  | 'value'
>;

export function Textarea({ maxLength, minRows = 3, ...rest }: TextareaProps) {
  if (maxLength) {
    return (
      <TextareaWithCounter maxLength={maxLength} minRows={minRows} {...rest} />
    );
  }

  return (
    <TextareaAutosize
      className={cx(getInputCn(), 'resize-none')}
      maxLength={maxLength}
      minRows={minRows}
      {...rest}
    />
  );
}

function TextareaWithCounter({
  defaultValue,
  minRows,
  maxLength,
  ...rest
}: TextareaProps) {
  const [value, setValue] = useState<string>(defaultValue?.toString() || '');

  return (
    <>
      <TextareaAutosize
        className={cx(getInputCn(), 'resize-none')}
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
