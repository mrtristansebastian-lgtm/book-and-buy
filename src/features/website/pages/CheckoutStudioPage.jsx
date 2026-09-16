import { E_BUSINESS_CHECKOUT_STUDIO_STEPS } from '../../../config/eBusinessPlatform';
import { WebsiteSurfaceStudio } from '../components/WebsiteSurfaceStudio';

export function CheckoutStudioPage() {
  return (
    <WebsiteSurfaceStudio
      surface="cart"
      title="Cart & checkout"
      lede="Preview Cart, Checkout, and Success screens. These mockups are studio-only."
      stepOptions={E_BUSINESS_CHECKOUT_STUDIO_STEPS}
      openLivePage="buy"
      showPageVisible={false}
    />
  );
}
