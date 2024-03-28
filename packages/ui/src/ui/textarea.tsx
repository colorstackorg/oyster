import TextareaAutosize, {
  TextareaAutosizeProps,
} from 'react-textarea-autosize';

import { cx } from '../utils/cx';
import { getInputCn } from './input';

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

export function Textarea({ minRows = 3, ...rest }: TextareaProps) {
  return (
    <TextareaAutosize
      className={cx(getInputCn(), 'resize-none')}
      minRows={minRows}
      {...rest}
    />
  );
}
