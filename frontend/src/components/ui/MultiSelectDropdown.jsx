import React, { useState, useRef, useEffect } from 'react';

const MultiSelectDropdown = ({ options, selected, onChange, placeholder = 'Select options' }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((val) => val !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="w-full text-left border border-zinc-700 rounded-md p-2 text-white bg-zinc-900"
        onClick={() => setOpen(!open)}
      >
        {selected.length > 0
          ? options.filter((op) => selected.includes(op._id)).map((op) => op.name).join(', ')
          : placeholder}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-md max-h-48 overflow-y-auto">
          {options.map((op) => (
            <label
              key={op._id}
              className="flex items-center space-x-2 p-2 hover:bg-zinc-800 text-white cursor-pointer"
            >
              <input
                type="checkbox"
                value={op._id}
                checked={selected.includes(op._id)}
                onChange={() => toggleSelect(op._id)}
              />
              <span>{op.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
