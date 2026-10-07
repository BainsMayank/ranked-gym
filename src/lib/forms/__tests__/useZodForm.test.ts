import { act, renderHook } from '@testing-library/react-native';
import { z } from 'zod';

import { useZodForm } from '../useZodForm';

const schema = z.object({
  name: z.string().trim().min(1, { error: 'Required.' }),
  age: z.coerce.number().min(13, { error: 'Too young.' }),
});

describe('useZodForm', () => {
  it('hides errors until a field is blurred or the form is submitted', async () => {
    const { result } = await renderHook(() => useZodForm(schema, { name: '', age: '10' }));
    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toEqual({});

    await act(() => result.current.blur('age'));
    expect(result.current.errors).toEqual({ age: 'Too young.' });

    const onValid = jest.fn();
    await act(() => result.current.submit(onValid));
    expect(onValid).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({ name: 'Required.', age: 'Too young.' });
  });

  it('passes parsed output to onValid', async () => {
    const { result } = await renderHook(() => useZodForm(schema, { name: '', age: '' }));
    await act(() => {
      result.current.field('name').onChangeText(' Asha ');
      result.current.setValue('age', '19');
    });
    const onValid = jest.fn();
    await act(() => result.current.submit(onValid));
    expect(onValid).toHaveBeenCalledWith({ name: 'Asha', age: 19 });
  });
});
