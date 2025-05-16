import React from 'react';
import Select, { MultiValue, SingleValue, ActionMeta } from 'react-select';

type OptionType = {
  value: string;
  label: string;
};

interface SelectProps<T = OptionType> {
  options: T[];
  value?: T | MultiValue<T> | null;
  defaultValue?: T | MultiValue<T> | null;
  className?: string;
  styles?: any;
  isMulti?: boolean;
  onChange?: (
    newValue: SingleValue<T> | MultiValue<T>,
    actionMeta: ActionMeta<T>
  ) => void;
}

const CommonSelect = <T extends OptionType>({
  options,
  value,
  defaultValue,
  className,
  isMulti = false,
  onChange,
}: SelectProps<T>) => {
  return (
    <Select
      classNamePrefix='react-select'
      className={className}
      options={options}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      isMulti={isMulti}
      placeholder='Select'
    />
  );
};

export default CommonSelect;
export type { OptionType as Option };
