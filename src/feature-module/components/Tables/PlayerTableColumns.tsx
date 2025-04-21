import React from 'react';
import { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { all_routes } from '../../router/all_routes';

interface PlayerTableColumnsProps {
  handlePlayerClick: (record: any) => void;
  location: any;
}

export const getPlayerTableColumns = ({
  handlePlayerClick,
  location,
}: PlayerTableColumnsProps): TableProps<any>['columns'] => [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text: string, record: any) => (
      <div key={record.id} className='d-flex align-items-center'>
        <div
          onClick={() => handlePlayerClick(record)}
          className='avatar avatar-md cursor-pointer'
        >
          <ImageWithBasePath
            src={record.imgSrc}
            className='img-fluid rounded-circle'
            alt='img'
          />
        </div>
        <div className='ms-2'>
          <p className='cursor-pointer text-primary mb-0'>
            <span
              onClick={() => handlePlayerClick(record)}
              className='cursor-pointer'
            >
              {text}
            </span>
          </p>
        </div>
      </div>
    ),
    sorter: (a: any, b: any) => a.name.localeCompare(b.name),
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    sorter: (a: any, b: any) => a.gender.localeCompare(b.gender),
  },
  {
    title: 'DOB',
    dataIndex: 'dob',
    sorter: (a: any, b: any) => a.dob.localeCompare(b.dob),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a: any, b: any) => a.age - b.age,
  },
  {
    title: 'School Name',
    dataIndex: 'section',
    sorter: (a: any, b: any) => a.section.localeCompare(b.section),
  },
  {
    title: 'Grade',
    dataIndex: 'class',
    sorter: (a: any, b: any) => a.class.localeCompare(b.class),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (text: string) => (
      <>
        {text === 'Active' ? (
          <span className='badge badge-soft-success d-inline-flex align-items-center'>
            <i className='ti ti-circle-filled fs-5 me-1'></i>
            {text}
          </span>
        ) : (
          <span className='badge badge-soft-danger d-inline-flex align-items-center'>
            <i className='ti ti-circle-filled fs-5 me-1'></i>
            {text}
          </span>
        )}
      </>
    ),
    sorter: (a: any, b: any) => a.status.localeCompare(b.status),
  },
  {
    title: 'AAU Number',
    dataIndex: 'aauNumber',
    sorter: (a: any, b: any) => a.aauNumber.localeCompare(b.aauNumber),
  },
  {
    title: 'Action',
    dataIndex: 'action',
    render: (_, record: any) => (
      <div className='d-flex align-items-center'>
        <div className='dropdown'>
          <Link
            to='#'
            className='btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0'
            data-bs-toggle='dropdown'
            aria-expanded='false'
          >
            <i className='ti ti-dots-vertical fs-14' />
          </Link>
          <ul className='dropdown-menu dropdown-menu-right p-3'>
            <li>
              <div
                className='dropdown-item rounded-1 cursor-pointer'
                onClick={() => handlePlayerClick(record)}
              >
                <i className='ti ti-menu me-2' />
                View
              </div>
            </li>
            <li>
              <Link
                to={`${all_routes.editPlayer}/${record.id}`}
                state={{
                  player: {
                    ...record,
                    playerId: record.id,
                    _id: record.id,
                  },
                  from: location.pathname,
                }}
                className='dropdown-item rounded-1'
              >
                <i className='ti ti-edit me-2' />
                Edit
              </Link>
            </li>
          </ul>
        </div>
      </div>
    ),
  },
];
