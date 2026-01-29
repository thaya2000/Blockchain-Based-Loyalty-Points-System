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
              <small>Points earned when purchased with SOL</small>
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
        .product-management {
          margin-top: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-header h2 {
          margin: 0;
        }

        .btn-primary {
          background: #14f195;
          color: black;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #0fd980;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(20, 241, 149, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .product-form {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
        }

        .product-form h3 {
          margin: 0 0 1.5rem 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .form-group input,
        .form-group textarea {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #14f195;
        }

        .form-group small {
          margin-top: 0.25rem;
          color: #666;
          font-size: 0.85rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .product-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .product-card.unavailable {
          opacity: 0.7;
        }

        .product-image {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
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
          background: rgba(255, 0, 0, 0.9);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .product-details {
          padding: 1.5rem;
        }

        .product-details h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.3rem;
        }

        .product-description {
          color: #666;
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        .product-pricing {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .price-tag, .reward-tag {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .price-label, .reward-label {
          font-size: 0.9rem;
          color: #666;
        }

        .price-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #14f195;
        }

        .reward-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #ff6b6b;
        }

        .stock-info {
          padding: 0.5rem;
          background: #fff3cd;
          border-radius: 6px;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        .product-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.5rem;
        }

        .product-actions button {
          padding: 0.5rem;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-edit {
          background: #2196f3;
          color: white;
        }

        .btn-edit:hover {
          background: #1976d2;
          transform: translateY(-2px);
        }

        .btn-toggle {
          color: white;
        }

        .btn-enable {
          background: #4caf50;
        }

        .btn-enable:hover {
          background: #45a049;
          transform: translateY(-2px);
        }

        .btn-disable {
          background: #ff9800;
        }

        .btn-disable:hover {
          background: #f57c00;
          transform: translateY(-2px);
        }

        .btn-delete {
          background: #f44336;
          color: white;
        }

        .btn-delete:hover {
          background: #d32f2f;
          transform: translateY(-2px);
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
          background: #f8f9fa;
          border-radius: 12px;
          color: #666;
          font-size: 1.1rem;
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
