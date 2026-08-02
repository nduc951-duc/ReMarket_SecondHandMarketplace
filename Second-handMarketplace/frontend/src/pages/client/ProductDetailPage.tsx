import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import ProductSection from '@/components/marketplace/ProductSection';
import { ProductGallery } from '@/components/product-detail/ProductGallery';
import { ProductInformation } from '@/components/product-detail/ProductInformation';
import { ProductPurchasePanel } from '@/components/product-detail/ProductPurchasePanel';
import { PurchaseDialog } from '@/components/product-detail/PurchaseDialog';
import { ReportDialog, type ProductReportInput } from '@/components/product-detail/ReportDialog';
import { ReviewList } from '@/components/product-detail/ReviewList';
import { SellerCard } from '@/components/product-detail/SellerCard';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryName } from '@/data/marketplaceConfig';
import { createPayment } from '@/services/paymentService';
import { getSellerFollowStatus, toggleSellerFollow } from '@/services/followService';
import { getProductById, getProducts } from '@/services/productService';
import { createProductReport } from '@/services/reportService';
import { getReviewsByProduct } from '@/services/reviewService';
import { createTransaction } from '@/services/transactionService';
import { getWishlistStatus, toggleWishlist } from '@/services/wishlistService';
import { useAuthStore } from '@/store/authStore';
import type { PaymentMethod, Product, Review, Transaction } from '@/types/domain';

const PRODUCT_CACHE_TTL = 5 * 60 * 1000;

interface ProductCache {
  product: Product;
  savedAt: number;
}

function getProductImages(product: Product | null): string[] {
  if (!product) return [];
  return [product.image_url, ...(product.images || [])].filter((image): image is string =>
    Boolean(image),
  );
}

function readProductCache(productId: string): Product | null {
  try {
    const cached = JSON.parse(
      sessionStorage.getItem(`remarket_product_${productId}`) || 'null',
    ) as ProductCache | null;
    return cached && Date.now() - cached.savedAt <= PRODUCT_CACHE_TTL ? cached.product : null;
  } catch {
    return null;
  }
}

function writeProductCache(productId: string, product: Product) {
  try {
    sessionStorage.setItem(
      `remarket_product_${productId}`,
      JSON.stringify({ product, savedAt: Date.now() }),
    );
  } catch {
    // Session cache is optional.
  }
}

function DetailSkeleton() {
  return (
    <MarketplaceLayout>
      <Skeleton className="mb-6 h-9 w-28 rounded-full" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="space-y-5">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </MarketplaceLayout>
  );
}

function ProductDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [wishlisted, setWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [orderNote, setOrderNote] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{
    type: 'success' | 'error' | '';
    message: string;
  }>({ type: '', message: '' });
  const [reportOpen, setReportOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState('');
  const [followingSeller, setFollowingSeller] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!id) {
      setError('Đường dẫn sản phẩm không hợp lệ.');
      setIsLoading(false);
      return;
    }

    const cachedProduct = readProductCache(id);
    if (cachedProduct) {
      setProduct(cachedProduct);
      setIsLoading(false);
    }

    try {
      if (!cachedProduct) setIsLoading(true);
      setError('');
      const viewKey = `viewed_product_${id}`;
      const alreadyViewed = sessionStorage.getItem(viewKey) === '1';
      if (!alreadyViewed) sessionStorage.setItem(viewKey, '1');
      const data = await getProductById(id, { skipView: alreadyViewed });
      setProduct(data);
      setSelectedImage(0);
      writeProductCache(id, data);

      const sideLoads: Promise<unknown>[] = [];

      if (user) {
        sideLoads.push(
          getWishlistStatus(id)
            .then(setWishlisted)
            .catch(() => setWishlisted(false)),
        );
        if (data.seller_id && data.seller_id !== user.id) {
          sideLoads.push(
            getSellerFollowStatus(data.seller_id)
              .then(setFollowingSeller)
              .catch(() => setFollowingSeller(false)),
          );
        }
      }

      setIsLoadingReviews(true);
      sideLoads.push(
        getReviewsByProduct(data.id, { limit: 10 })
          .then((reviewData: { reviews?: Review[]; total?: number }) => {
            setReviews(reviewData.reviews || []);
            setReviewTotal(reviewData.total || 0);
          })
          .catch(() => {
            setReviews([]);
            setReviewTotal(0);
          })
          .finally(() => setIsLoadingReviews(false)),
      );

      const category = getCategoryName(data.category);
      if (category && category !== 'Khác') {
        sideLoads.push(
          getProducts({ category, limit: 5 })
            .then((result) =>
              setRelatedProducts(
                (result.products || []).filter((item) => item.id !== id).slice(0, 4),
              ),
            )
            .catch(() => setRelatedProducts([])),
        );
      }

      await Promise.allSettled(sideLoads);
    } catch (loadError) {
      if (!cachedProduct) {
        setProduct(null);
        setError(
          loadError instanceof Error ? loadError.message : 'Không thể tải thông tin sản phẩm.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const requireLogin = () => {
    if (user) return true;
    navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
    return false;
  };

  const handleWishlist = async () => {
    if (!requireLogin()) return;
    try {
      setIsWishlistLoading(true);
      const result = await toggleWishlist(id);
      setWishlisted(Boolean(result.wishlisted));
    } catch (wishlistError) {
      setError(
        wishlistError instanceof Error ? wishlistError.message : 'Không thể cập nhật tin đã lưu.',
      );
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleOrder = async () => {
    if (!product || !requireLogin()) return;
    try {
      setIsOrdering(true);
      setOrderFeedback({ type: '', message: '' });
      const transaction = (await createTransaction({
        product_id: id,
        payment_method: paymentMethod,
        note: orderNote,
      })) as Transaction;

      if (paymentMethod === 'momo' || paymentMethod === 'vnpay') {
        const payment = await createPayment({
          orderId: transaction.id,
          amount: transaction.amount || product.price,
          orderInfo: `Thanh toán đơn hàng ${transaction.id}`,
          returnUrl: `${window.location.origin}/payment/return/${paymentMethod}`,
          paymentMethod,
        });
        if (!payment.paymentUrl) {
          throw new Error('Cổng thanh toán chưa trả về đường dẫn thanh toán.');
        }
        window.location.assign(payment.paymentUrl);
        return;
      }

      setOrderFeedback({
        type: 'success',
        message: 'Đặt hàng thành công. Người bán sẽ xác nhận đơn của bạn.',
      });
      window.setTimeout(() => navigate('/transactions'), 900);
    } catch (orderError) {
      setOrderFeedback({
        type: 'error',
        message: orderError instanceof Error ? orderError.message : 'Không thể tạo đơn hàng.',
      });
    } finally {
      setIsOrdering(false);
    }
  };

  const handleReport = async ({ reason, details, evidenceUrl }: ProductReportInput) => {
    if (!requireLogin()) return;
    try {
      setIsReporting(true);
      setReportFeedback('');
      await createProductReport(id, reason, details, evidenceUrl ? [evidenceUrl] : []);
      setReportFeedback('Báo cáo đã được gửi tới đội kiểm duyệt.');
      window.setTimeout(() => setReportOpen(false), 900);
    } catch (reportError) {
      setReportFeedback(
        reportError instanceof Error ? reportError.message : 'Không thể gửi báo cáo.',
      );
    } finally {
      setIsReporting(false);
    }
  };

  const handleFollowSeller = async () => {
    if (!product?.seller_id || !requireLogin()) return;
    try {
      setFollowLoading(true);
      const result = await toggleSellerFollow(product.seller_id);
      setFollowingSeller(result.following);
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : 'Không thể cập nhật theo dõi.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (!product) {
    return (
      <MarketplaceLayout>
        <ErrorState
          title="Không tìm thấy sản phẩm"
          description={error || 'Sản phẩm không tồn tại hoặc đã bị ẩn.'}
          retryLabel="Thử lại"
          onRetry={() => void loadProduct()}
        />
      </MarketplaceLayout>
    );
  }

  const productImages = getProductImages(product);
  const owner = Boolean(user && product.seller_id === user.id);
  const pageTitle = `${product.title} | ReMarket`;
  const pageDescription =
    product.description?.slice(0, 160) || 'Xem chi tiết sản phẩm đồ cũ trên ReMarket.';
  const canonicalUrl = `${window.location.origin}/products/${id}`;

  return (
    <MarketplaceLayout className="space-y-12">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />
        {productImages[0] && <meta property="og:image" content={productImages[0]} />}
      </Helmet>

      <Button render={<Link to="/app" />} variant="ghost" size="sm">
        <ArrowLeft />
        Quay lại marketplace
      </Button>

      {error && (
        <div className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {error}
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <ProductGallery
          title={product.title}
          images={productImages}
          selectedIndex={selectedImage}
          onSelect={setSelectedImage}
        />
        <div className="space-y-5">
          <ProductPurchasePanel
            product={product}
            owner={owner}
            wishlisted={wishlisted}
            wishlistLoading={isWishlistLoading}
            onBuy={() => (requireLogin() ? setPurchaseOpen(true) : undefined)}
            onWishlist={() => void handleWishlist()}
            onReport={() => (requireLogin() ? setReportOpen(true) : undefined)}
          />
          <SellerCard
            product={product}
            canFollow={Boolean(user && !owner)}
            following={followingSeller}
            followLoading={followLoading}
            onToggleFollow={() => void handleFollowSeller()}
          />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <ProductInformation product={product} imageCount={productImages.length} />
        <ReviewList reviews={reviews} total={reviewTotal} loading={isLoadingReviews} />
      </div>

      {relatedProducts.length > 0 && (
        <ProductSection
          title="Sản phẩm tương tự"
          subtitle="Các lựa chọn khác trong cùng danh mục."
          products={relatedProducts}
          query={`category=${encodeURIComponent(getCategoryName(product.category))}`}
        />
      )}

      <PurchaseDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        product={product}
        image={productImages[0]}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        note={orderNote}
        onNoteChange={setOrderNote}
        submitting={isOrdering}
        feedback={orderFeedback}
        onConfirm={() => void handleOrder()}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        submitting={isReporting}
        feedback={reportFeedback}
        onSubmit={handleReport}
      />
    </MarketplaceLayout>
  );
}

export default ProductDetailPage;
