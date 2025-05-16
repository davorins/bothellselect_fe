import React from 'react';
import Select, { MultiValue, SingleValue, ActionMeta } from 'react-select';

// Define the Option type first
type OptionType = {
  value: string;
  label: string;
};

// Then define the interface for props
interface SelectProps {
  options: OptionType[];
  value?: OptionType | MultiValue<OptionType> | null;
  defaultValue?: OptionType | MultiValue<OptionType> | null;
  className?: string;
  styles?: any;
  isMulti?: boolean;
  onChange?: (
    newValue: SingleValue<OptionType> | MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>
  ) => void;
}

const CommonSelect: React.FC<SelectProps> = ({
  options,
  value,
  defaultValue,
  className,
  isMulti = false,
  onChange,
}) => {
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
