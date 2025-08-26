import React from 'react';
import { toast } from 'react-toastify';
import './ConfirmToast.css'; // Assuming you have a CSS file for styling

const ConfirmToast = ({ closeToast, message, onConfirm, onCancel }) => {
  const handleConfirm = () => {
    onConfirm();
    closeToast();
  };

  const handleCancel = () => {
    onCancel();
    closeToast();
  };

  return (
    <div className="confirm-toast-content">
      <p>{message}</p>
      <div className="confirm-toast-actions">
        <button onClick={handleConfirm} className="confirm-btn-yes">Yes</button>
        <button onClick={handleCancel} className="confirm-btn-no">No</button>
      </div>
    </div>
  );
};

export const showConfirmToast = (message) => {
  // Add a class to the body to apply the overlay style
  document.body.classList.add('confirm-toast-open');

  return new Promise((resolve) => {
    toast(
      ({ closeToast }) => (
        <ConfirmToast
          closeToast={closeToast}
          message={message}
          onConfirm={() => resolve(true)}
          onCancel={() => resolve(false)}
        />
      ),
      {
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        className: 'confirm-toast-center', // Add custom class for centering
        bodyClassName: 'confirm-toast-body', // Optional: for body content styling
        hideProgressBar: true, // Hide progress bar for confirmation
        // Add an onClose callback to remove the class from the body
        onClose: () => {
          document.body.classList.remove('confirm-toast-open');
        },
      }
    );
  });
};