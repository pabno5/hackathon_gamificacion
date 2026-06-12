class ApiResponse {
  static success(data, message = null, meta = null) {
    return {
      success: true,
      ...(message && { message }),
      data,
      ...(meta && { meta }),
    };
  }

  static paginated(data, total, page, limit) {
    return ApiResponse.success(data, null, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    });
  }
}

module.exports = ApiResponse;
