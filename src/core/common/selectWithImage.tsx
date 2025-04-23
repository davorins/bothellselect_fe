import React, { useState } from 'react';
import ImageWithBasePath from './imageWithBasePath';
import { Dropdown } from 'primereact/dropdown';

export const SelectWithImage = () => {
  const options = [
    {
      label: 'Dado',
      value: 'avatar-27.jpg',
      image: '/assets/img/profiles/avatar-27.jpg',
    },
  ];
  const [selectedOption, setSelectedOption] = useState(options[0]);

  const customOptionTemplate = (option: any) => (
    <div className='p-clearfix'>
      <ImageWithBasePath alt={option.label} src={option.image} />
      <span>{option.label}</span>
    </div>
  );

  const customValueTemplate = (option: any) => {
    if (!option) {
      return <span>{'Choose Owner'}</span>;
    }
    return (
      <div className='p-clearfix'>
        <ImageWithBasePath alt={option.label} src={option.image} />
        <span>{option.label}</span>
      </div>
    );
  };
  return (
    <div>
      <Dropdown
        value={selectedOption}
        options={options}
        optionLabel='label'
        optionValue='value'
        itemTemplate={customOptionTemplate}
        valueTemplate={customValueTemplate}
        onChange={(e) => setSelectedOption(e.value)}
        style={{ width: '100%' }}
        placeholder='Choose Owner'
      />
    </div>
  );
};
