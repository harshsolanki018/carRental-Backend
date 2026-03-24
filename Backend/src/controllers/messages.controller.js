const ContactMessage = require('../models/contact-message.model');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');
const { MESSAGE_STATUS } = require('../constants/enums');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

const createMessage = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();

  if (!name || !email || !message) {
    throw new HttpError(400, 'Please fill all required fields.');
  }

  if (!isValidEmail(email)) {
    throw new HttpError(400, 'Please enter a valid email address.');
  }

  if (phone && !isValidPhone(phone)) {
    throw new HttpError(400, 'Phone number must be 10 digits.');
  }

  const ticket = new ContactMessage({
    name,
    email,
    phone: phone || 'Not Provided',
    subject: subject || 'General Inquiry',
    message,
    status: MESSAGE_STATUS.NEW,
  });

  await ticket.save();

  res.status(201).json({
    success: true,
    message: 'Your message has been sent successfully!',
    data: ticket,
  });
});

const listMessages = asyncHandler(async (req, res) => {
  const messages = await ContactMessage.find().sort({ createdAt: -1 });
  res.json({
    success: true,
    data: messages,
  });
});

const updateMessageStatus = asyncHandler(async (req, res) => {
  const ticketId = String(req.params.ticketId || '').trim();
  const status = String(req.body.status || '').trim();
  const allowedStatuses = Object.values(MESSAGE_STATUS);

  if (!status) {
    throw new HttpError(400, 'Status is required.');
  }

  if (!allowedStatuses.includes(status)) {
    throw new HttpError(
      400,
      `Invalid status. Allowed values: ${allowedStatuses.join(', ')}.`
    );
  }

  const message = await ContactMessage.findOne({ ticketId });
  if (!message) {
    throw new HttpError(404, 'Message not found.');
  }

  message.status = status;
  await message.save();

  res.json({
    success: true,
    message: 'Message status updated.',
    data: message,
  });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const ticketId = String(req.params.ticketId || '').trim();
  const message = await ContactMessage.findOne({ ticketId });
  if (!message) {
    throw new HttpError(404, 'Message not found.');
  }

  await message.deleteOne();

  res.json({
    success: true,
    message: 'Message deleted successfully.',
  });
});

module.exports = {
  createMessage,
  listMessages,
  updateMessageStatus,
  deleteMessage,
};
