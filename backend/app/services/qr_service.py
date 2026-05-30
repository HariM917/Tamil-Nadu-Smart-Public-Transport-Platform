import base64
from io import BytesIO
import qrcode


class QRService:
    """Service to handle QR code generation for digital passes and tickets."""

    @staticmethod
    def generate_qr_base64(data: str) -> str:
        """Generate a QR code and return it as a base64 encoded PNG data URL."""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")
            buffered = BytesIO()
            img.save(buffered, format="PNG")  # type: ignore
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            # Fallback if qrcode library is missing or fails
            return f"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><rect width='150' height='150' fill='lightgray'/><text x='10' y='80' fill='black'>QR: {data[:15]}...</text></svg>"


qr_service = QRService()
