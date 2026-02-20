import { useState, useEffect } from 'react';

interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceSol: number;
  priceLoyaltyPoints: number | null;
  loyaltyPointsReward: number;
  stockQuantity: number | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormData {
  name: string;
  description: string;
  imageUrl: string;
  priceSol: string;
  priceLoyaltyPoints: string;
  loyaltyPointsReward: string;
  stockQuantity: string;
}

interface Props {
  merchantId: string;
}

export default function ProductManagement({ merchantId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    imageUrl: '',
    priceSol: '',
    priceLoyaltyPoints: '',
    loyaltyPointsReward: '',
    stockQuantity: '',
  });

  useEffect(() => {
    fetchProducts();
  }, [merchantId]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/products?merchantId=${merchantId}`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      priceSol: '',
      priceLoyaltyPoints: '',
      loyaltyPointsReward: '',
      stockQuantity: '',
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        merchantId,
        name: formData.name,
        description: formData.description,
        imageUrl: formData.imageUrl,
        priceSol: Math.floor(parseFloat(formData.priceSol) * 1e9), // Convert SOL to lamports
        priceLoyaltyPoints: formData.priceLoyaltyPoints ? parseInt(formData.priceLoyaltyPoints) : null,
        loyaltyPointsReward: parseInt(formData.loyaltyPointsReward),
        stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
      };

      const response = await fetch('http://localhost:3001/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        alert('Product created successfully!');
        fetchProducts();
        resetForm();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setLoading(true);

    try {
      const updates: any = {};
      if (formData.name !== editingProduct.name) updates.name = formData.name;
      if (formData.description !== editingProduct.description) updates.description = formData.description;
      if (formData.imageUrl !== editingProduct.imageUrl) updates.imageUrl = formData.imageUrl;
      if (formData.priceSol) {
        const lamports = Math.floor(parseFloat(formData.priceSol) * 1e9);
        if (lamports !== editingProduct.priceSol) updates.priceSol = lamports;
      }
      if (formData.priceLoyaltyPoints) {
        const points = parseInt(formData.priceLoyaltyPoints);
        if (points !== editingProduct.priceLoyaltyPoints) updates.priceLoyaltyPoints = points;
      }
      if (formData.loyaltyPointsReward) {
        const reward = parseInt(formData.loyaltyPointsReward);
        if (reward !== editingProduct.loyaltyPointsReward) updates.loyaltyPointsReward = reward;
      }
      if (formData.stockQuantity) {
        const stock = parseInt(formData.stockQuantity);
        if (stock !== editingProduct.stockQuantity) updates.stockQuantity = stock;
      }

      const response = await fetch(`http://localhost:3001/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        alert('Product updated successfully!');
        fetchProducts();
        resetForm();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      priceSol: (product.priceSol / 1e9).toString(),
      priceLoyaltyPoints: product.priceLoyaltyPoints ? product.priceLoyaltyPoints.toString() : '',
      loyaltyPointsReward: product.loyaltyPointsReward.toString(),
      stockQuantity: product.stockQuantity ? product.stockQuantity.toString() : '',
    });
    setShowForm(true);
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      const response = await fetch(`http://localhost:3001/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      });

      const data = await response.json();
      if (data.success) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/products/${productId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('Product deleted successfully');
        fetchProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  return (
    <div className="product-management">
      <div className="section-header">
        <h2>📦 Product Management</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✗ Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form className="product-form" onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}>
          <h3>{editingProduct ? '✏️ Edit Product' : '➕ New Product'}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Premium Coffee"
              />
            </div>

            <div className="form-group">
              <label>Image URL *</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                required
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              placeholder="Describe your product..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price in SOL *</label>
              <input
                type="number"
                name="priceSol"
                value={formData.priceSol}
                onChange={handleInputChange}
                required
                step="0.001"
                min="0"
                placeholder="0.01"
              />
              <small>Amount in SOL (e.g., 0.01 SOL)</small>
            </div>

            <div className="form-group">
              <label>Price in Loyalty Points</label>
              <input
                type="number"
                name="priceLoyaltyPoints"
                value={formData.priceLoyaltyPoints}
                onChange={handleInputChange}
                min="0"
                placeholder="100"
              />
              <small>Leave empty if not purchasable with points</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Loyalty Points Reward *</label>
              <input
                type="number"
                name="loyaltyPointsReward"
                value={formData.loyaltyPointsReward}
                onChange={handleInputChange}
                required
                min="0"
                placeholder="10"
              />
              <small>Points customers earn when purchasing (recommended: 1 SOL = 100 LP)</small>
            </div>

            <div className="form-group">
              <label>Stock Quantity</label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleInputChange}
                min="0"
                placeholder="100"
              />
              <small>Leave empty for unlimited stock</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="products-grid">
        {products.length === 0 ? (
          <div className="empty-state">
            <p>📦 No products yet. Create your first product!</p>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className={`product-card ${!product.isAvailable ? 'unavailable' : ''}`}>
              <div className="product-image">
                <img src={product.imageUrl} alt={product.name} />
                {!product.isAvailable && <div className="unavailable-badge">Unavailable</div>}
              </div>
              
              <div className="product-details">
                <h3>{product.name}</h3>
                <p className="product-description">{product.description}</p>
                
                <div className="product-pricing">
                  <div className="price-tag">
                    <span className="price-label">SOL Price:</span>
                    <span className="price-value">◎ {(product.priceSol / 1e9).toFixed(3)}</span>
                  </div>
                  {product.priceLoyaltyPoints && (
                    <div className="price-tag">
                      <span className="price-label">Points:</span>
                      <span className="price-value">💎 {product.priceLoyaltyPoints}</span>
                    </div>
                  )}
                  <div className="reward-tag">
                    <span className="reward-label">Earns:</span>
                    <span className="reward-value">+{product.loyaltyPointsReward} pts</span>
                  </div>
                </div>

                {product.stockQuantity !== null && (
                  <div className="stock-info">
                    📦 Stock: {product.stockQuantity} units
                  </div>
                )}

                <div className="product-actions">
                  <button className="btn-edit" onClick={() => handleEditClick(product)}>
                    ✏️ Edit
                  </button>
                  <button 
                    className={`btn-toggle ${product.isAvailable ? 'btn-disable' : 'btn-enable'}`}
                    onClick={() => handleToggleAvailability(product)}
                  >
                    {product.isAvailable ? '🚫 Disable' : '✓ Enable'}
                  </button>
                  <button className="btn-delete" onClick={() => handleDeleteProduct(product.id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }

        .product-management {
          margin-top: 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          margin: 0;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: #fff;
          padding: 10px 22px;
          border: none;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(139,92,246,0.35);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139,92,246,0.5);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: rgba(255,255,255,0.08);
          color: #cbd5e1;
          padding: 10px 22px;
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: rgba(255,255,255,0.13);
        }

        .product-form {
          background: rgba(15,12,41,0.85);
          border: 1.5px solid rgba(139,92,246,0.25);
          padding: 24px;
          border-radius: 14px;
          margin-bottom: 24px;
          backdrop-filter: blur(10px);
        }

        .product-form h3 {
          margin: 0 0 20px 0;
          color: #e2e8f0;
          font-size: 1rem;
          font-weight: 700;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 7px;
          color: #94a3b8;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group input,
        .form-group textarea {
          padding: 12px 14px;
          border: 1.5px solid rgba(139,92,246,0.3);
          border-radius: 10px;
          font-size: 0.95rem;
          background: rgba(15,12,41,0.9);
          color: #f1f5f9;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: #475569;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.15);
        }

        .form-group small {
          margin-top: 5px;
          color: #64748b;
          font-size: 0.78rem;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .product-card {
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
          border-color: rgba(139,92,246,0.35);
        }

        .product-card.unavailable {
          opacity: 0.6;
        }

        .product-image {
          position: relative;
          width: 100%;
          height: 180px;
          overflow: hidden;
          background: rgba(15,12,41,0.5);
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .unavailable-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(239,68,68,0.9);
          color: #fff;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .product-details {
          padding: 16px;
        }

        .product-details h3 {
          margin: 0 0 6px 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .product-description {
          color: #94a3b8;
          margin: 0 0 12px 0;
          line-height: 1.5;
          font-size: 0.87rem;
        }

        .product-pricing {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
          padding: 12px;
          background: rgba(139,92,246,0.08);
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 10px;
        }

        .price-tag, .reward-tag {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .price-label, .reward-label {
          font-size: 0.82rem;
          color: #64748b;
        }

        .price-value {
          font-size: 1rem;
          font-weight: 700;
          color: #a78bfa;
        }

        .reward-value {
          font-size: 0.9rem;
          font-weight: 700;
          color: #34d399;
        }

        .stock-info {
          padding: 6px 10px;
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.25);
          border-radius: 8px;
          font-size: 0.82rem;
          color: #fcd34d;
          margin-bottom: 12px;
          text-align: center;
          font-weight: 600;
        }

        .product-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          margin-top: 4px;
        }

        .product-actions button {
          padding: 7px 6px;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-edit {
          background: rgba(59,130,246,0.2);
          color: #93c5fd;
          border: 1px solid rgba(59,130,246,0.3) !important;
        }

        .btn-edit:hover {
          background: rgba(59,130,246,0.35);
          transform: translateY(-1px);
        }

        .btn-toggle {
          border: 1px solid transparent !important;
        }

        .btn-enable {
          background: rgba(16,185,129,0.2);
          color: #6ee7b7;
          border-color: rgba(16,185,129,0.3) !important;
        }

        .btn-enable:hover {
          background: rgba(16,185,129,0.35);
          transform: translateY(-1px);
        }

        .btn-disable {
          background: rgba(245,158,11,0.2);
          color: #fcd34d;
          border-color: rgba(245,158,11,0.3) !important;
        }

        .btn-disable:hover {
          background: rgba(245,158,11,0.35);
          transform: translateY(-1px);
        }

        .btn-delete {
          background: rgba(239,68,68,0.2);
          color: #fca5a5;
          border: 1px solid rgba(239,68,68,0.3) !important;
        }

        .btn-delete:hover {
          background: rgba(239,68,68,0.35);
          transform: translateY(-1px);
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px 20px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #475569;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          .products-grid {
            grid-template-columns: 1fr;
          }
          .product-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
