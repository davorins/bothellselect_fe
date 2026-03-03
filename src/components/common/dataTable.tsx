import React from 'react';
import { Table } from 'antd';

interface TableData {
  id: string;
  name: string;
  position: string;
  // Add other fields as needed
}

interface DataTableProps {
  datatable: TableData[]; // Pass `datatable` as a prop
}

const DataTable: React.FC<DataTableProps> = ({ datatable }) => {
  const data = datatable.map((item: TableData) => ({
    key: item.id, // Ensure each item has a unique `key`
    ...item,
  }));

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a: TableData, b: TableData) => a.name.length - b.name.length,
    },
    {
      title: 'Position',
      dataIndex: 'position',
      sorter: (a: TableData, b: TableData) =>
        a.position.length - b.position.length,
    },
    // Other columns...
  ];

  return (
    <div className='page-wrapper'>
      <div className='content container-fluid'>
        <div className='page-header'>
          <div className='row'>
            <div className='col'>
              <h3 className='page-title'>Data Tables</h3>
            </div>
          </div>
        </div>
        <div className='row'>
          <div className='col-sm-12'>
            <div className='card'>
              <div className='card-header'>
                <h4 className='card-title'>Default Datatable</h4>
                <p className='card-text'>
                  This is the most basic example of the datatables
                </p>
              </div>
              <div className='card-body'>
                <Table dataSource={data} columns={columns} rowSelection={{}} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
