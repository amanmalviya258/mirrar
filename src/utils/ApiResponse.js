class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    if (statusCode < 400) {
      this.message = "Success";
    }
  }
}

export{ApiResponse};