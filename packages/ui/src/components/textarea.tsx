import TextareaAutosize, {
  type TextareaAutosizeProps,
} from 'react-textarea-autosize';

import { getInputCn } from './input';
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

export function Textarea({ minRows = 3, ...rest }: TextareaProps) {
  return (
    <TextareaAutosize
      className={cx(getInputCn(), 'resize-none')}
      minRows={minRows}
      {...rest}
    />
  );
}
