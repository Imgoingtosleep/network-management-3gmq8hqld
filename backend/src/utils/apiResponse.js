/**
 * รูปแบบ response กลาง ให้ทุก endpoint ตอบกลับเป็น shape เดียวกัน
 * { success, data, message }
 */
function ok(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function created(res, data, message = 'Created') {
  return ok(res, data, message, 201);
}

function fail(res, message = 'Something went wrong', status = 400) {
  return res.status(status).json({ success: false, message });
}

module.exports = { ok, created, fail };
