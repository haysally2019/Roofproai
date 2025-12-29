import React, { useState } from 'react';
import { Package, Plus, Search, Filter, Calendar, DollarSign, Truck, Check, X, Eye, MapPin, Clock, ShoppingCart, Star, ChevronRight, Building2, Phone, ExternalLink } from 'lucide-react';

interface MaterialOrder {
  id: string;
  poNumber: string;
  supplier: string;
  leadId: string;
  leadName: string;
  status: 'Pending' | 'Ordered' | 'In Transit' | 'Delivered' | 'Cancelled';
  dateOrdered: string;
  deliveryDate: string;
  totalCost: number;
  items: { name: string; quantity: number; unit: string; unitPrice: number; sku?: string }[];
  notes: string;
  branchLocation?: string;
  trackingNumber?: string;
  accountNumber?: string;
}

interface ABCProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  manufacturer: string;
  unit: string;
  price: number;
  inStock: boolean;
  stockLevel?: string;
  image?: string;
}

const MaterialOrders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaterialOrder | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cartItems, setCartItems] = useState<{ product: ABCProduct; quantity: number }[]>([]);

  const abcBranches = [
    { id: '1', name: 'ABC Supply - Dallas North', address: '1234 Industrial Blvd, Dallas, TX 75201', phone: '(555) 123-4567' },
    { id: '2', name: 'ABC Supply - Fort Worth', address: '5678 Commerce St, Fort Worth, TX 76102', phone: '(555) 234-5678' },
    { id: '3', name: 'ABC Supply - Arlington', address: '9012 Highway 360, Arlington, TX 76001', phone: '(555) 345-6789' }
  ];

  const productCategories = [
    'All',
    'Shingles',
    'Underlayment',
    'Ventilation',
    'Flashing & Trim',
    'Fasteners',
    'Ice & Water Shield',
    'Accessories'
  ];

  const abcProducts: ABCProduct[] = [
    {
      id: '1',
      sku: 'OC-DUR-TRU',
      name: 'Owens Corning Duration Shingles - Trudefinition',
      category: 'Shingles',
      manufacturer: 'Owens Corning',
      unit: 'square',
      price: 98.50,
      inStock: true,
      stockLevel: 'High'
    },
    {
      id: '2',
      sku: 'GAF-TL-HDZ',
      name: 'GAF Timberline HDZ Shingles',
      category: 'Shingles',
      manufacturer: 'GAF',
      unit: 'square',
      price: 95.75,
      inStock: true,
      stockLevel: 'High'
    },
    {
      id: '3',
      sku: 'GAF-TL-HD-IR',
      name: 'GAF Timberline HD Impact Resistant',
      category: 'Shingles',
      manufacturer: 'GAF',
      unit: 'square',
      price: 112.00,
      inStock: true,
      stockLevel: 'Medium'
    },
    {
      id: '4',
      sku: 'CT-LM-PRO',
      name: 'CertainTeed Landmark Pro Shingles',
      category: 'Shingles',
      manufacturer: 'CertainTeed',
      unit: 'square',
      price: 102.25,
      inStock: true,
      stockLevel: 'High'
    },
    {
      id: '5',
      sku: 'GAF-TIG-SA',
      name: 'GAF TigerPaw Synthetic Underlayment',
      category: 'Underlayment',
      manufacturer: 'GAF',
      unit: 'roll',
      price: 125.00,
      inStock: true,
      stockLevel: 'High'
    },
    {
      id: '6',
      sku: 'OC-SYNTH-UL',
      name: 'Owens Corning ProArmor Synthetic Underlayment',
      category: 'Underlayment',
      manufacturer: 'Owens Corning',
      unit: 'roll',
      price: 118.50,
      inStock: true,
      stockLevel: 'Medium'
    },
    {
      id: '7',
      sku: 'GAF-WS-IW',
      name: 'GAF WeatherWatch Ice & Water Shield',
      category: 'Ice & Water Shield',
      manufacturer: 'GAF',
      unit: 'roll',
      price: 89.99,
      inStock: true,
      stockLevel: 'High'
    },
    {
      id: '8',
      sku: 'OC-IW-PROT',
      name: 'Owens Corning Ice & Water Protector',
      category: 'Ice & Water Shield',
      manufacturer: 'Owens Corning',
      unit: 'roll',
      price: 87.50,
      inStock: true,
      stockLevel: 'Medium'
    },
    {
      id: '9',
      sku: 'GAF-COBRA-RV',
      name: 'GAF Cobra Ridge Vent',
      category: 'Ventilation',
      manufacturer: 'GAF',
      unit: 'piece',
      price: 45.00,
      inStock: true,
      stockLevel: 'High'
    },
    {
      id: '10',
      sku: 'DRIP-EDGE-AL',
      name: 'Aluminum Drip Edge - 10ft',
      category: 'Flashing & Trim',
      manufacturer: 'ABC Supply',
      unit: 'piece',
      price: 12.50,
      inStock: true,
      stockLevel: 'High'
    },
    {
      id: '11',
      sku: 'NAIL-COIL-15',
      name: 'Roofing Nails Coil 1-1/4"',
      category: 'Fasteners',
      manufacturer: 'Grip-Rite',
      unit: 'box',
      price: 38.99,
      inStock: true,
      stockLevel: 'High'
    },
    {
      id: '12',
      sku: 'STARTER-STRIP',
      name: 'GAF ProStart Starter Strip Shingles',
      category: 'Accessories',
      manufacturer: 'GAF',
      unit: 'roll',
      price: 65.00,
      inStock: true,
      stockLevel: 'Medium'
    }
  ];

  const mockOrders: MaterialOrder[] = [
    {
      id: '1',
      poNumber: 'PO-2025-001',
      supplier: 'ABC Supply',
      leadId: 'lead-1',
      leadName: 'Smith Residence',
      status: 'Ordered',
      dateOrdered: '2025-01-15',
      deliveryDate: '2025-01-22',
      totalCost: 8450,
      items: [
        { name: 'Owens Corning Duration Shingles', quantity: 35, unit: 'sq', unitPrice: 98.50, sku: 'OC-DUR-TRU' },
        { name: 'GAF TigerPaw Synthetic Underlayment', quantity: 10, unit: 'roll', unitPrice: 125, sku: 'GAF-TIG-SA' },
        { name: 'GAF Cobra Ridge Vent', quantity: 5, unit: 'piece', unitPrice: 45, sku: 'GAF-COBRA-RV' }
      ],
      notes: 'Deliver to job site, contact foreman on arrival',
      branchLocation: 'ABC Supply - Dallas North',
      trackingNumber: 'ABC2025001234',
      accountNumber: '123456'
    },
    {
      id: '2',
      poNumber: 'PO-2025-002',
      supplier: 'ABC Supply',
      leadId: 'lead-2',
      leadName: 'Johnson Commercial',
      status: 'In Transit',
      dateOrdered: '2025-01-10',
      deliveryDate: '2025-01-18',
      totalCost: 12300,
      items: [
        { name: 'GAF Timberline HDZ Shingles', quantity: 50, unit: 'sq', unitPrice: 95.75, sku: 'GAF-TL-HDZ' },
        { name: 'GAF WeatherWatch Ice & Water Shield', quantity: 8, unit: 'roll', unitPrice: 89.99, sku: 'GAF-WS-IW' }
      ],
      notes: 'Priority delivery - commercial project',
      branchLocation: 'ABC Supply - Fort Worth',
      trackingNumber: 'ABC2025001235',
      accountNumber: '123456'
    },
    {
      id: '3',
      poNumber: 'PO-2025-003',
      supplier: 'ABC Supply',
      leadId: 'lead-3',
      leadName: 'Martinez Property',
      status: 'Delivered',
      dateOrdered: '2025-01-05',
      deliveryDate: '2025-01-12',
      totalCost: 5600,
      items: [
        { name: 'CertainTeed Landmark Pro Shingles', quantity: 25, unit: 'sq', unitPrice: 102.25, sku: 'CT-LM-PRO' },
        { name: 'Aluminum Drip Edge', quantity: 40, unit: 'piece', unitPrice: 12.50, sku: 'DRIP-EDGE-AL' }
      ],
      notes: 'Delivered successfully - signed by site manager',
      branchLocation: 'ABC Supply - Dallas North',
      trackingNumber: 'ABC2025001236',
      accountNumber: '123456'
    }
  ];

  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Ordered': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Transit': 'bg-purple-100 text-purple-700 border-purple-200',
    'Delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Cancelled': 'bg-red-100 text-red-700 border-red-200'
  };

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = abcProducts.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && (searchTerm === '' || matchesSearch);
  });

  const addToCart = (product: ABCProduct) => {
    const existingItem = cartItems.find(item => item.product.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { product, quantity: 1 }]);
    }
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const stats = {
    total: mockOrders.length,
    ordered: mockOrders.filter(o => o.status === 'Ordered').length,
    inTransit: mockOrders.filter(o => o.status === 'In Transit').length,
    delivered: mockOrders.filter(o => o.status === 'Delivered').length,
    totalSpent: mockOrders.reduce((sum, o) => sum + o.totalCost, 0)
  };

  if (showCatalog) {
    return (
      <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCatalog(false)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Orders
          </button>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
              <ShoppingCart size={20} className="text-slate-600" />
              <span className="font-semibold text-slate-900">{cartItems.length} items</span>
              <span className="text-slate-600">|</span>
              <span className="font-bold text-blue-600">${cartTotal.toLocaleString()}</span>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
              disabled={cartItems.length === 0}
            >
              Checkout
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">ABC Supply Product Catalog</h1>
              <p className="text-red-100">Your trusted partner for roofing materials</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-red-100">Account Number</p>
              <p className="text-2xl font-bold">123456</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {productCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search products by name, SKU, or manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-mono mb-1">{product.sku}</p>
                  <h3 className="font-semibold text-slate-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-slate-600">{product.manufacturer}</p>
                </div>
                {product.inStock ? (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                    In Stock
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    Out of Stock
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                <div>
                  <p className="text-2xl font-bold text-slate-900">${product.price}</p>
                  <p className="text-xs text-slate-500">per {product.unit}</p>
                </div>
                {product.stockLevel && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Stock Level</p>
                    <p className={`text-sm font-semibold ${
                      product.stockLevel === 'High' ? 'text-emerald-600' :
                      product.stockLevel === 'Medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {product.stockLevel}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => addToCart(product)}
                disabled={!product.inStock}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} />
                Add to Order
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="text-blue-600" />
            Material Orders
          </h1>
          <p className="text-slate-500 mt-1">Manage purchase orders and material deliveries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCatalog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
          >
            <ShoppingCart size={20} />
            ABC Supply Catalog
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
          >
            <Plus size={20} />
            New PO
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">ABC Supply Integration</h2>
            <p className="text-red-100">Connected to Account #123456</p>
          </div>
          <div className="text-right">
            <p className="text-red-100 text-sm">Preferred Branch</p>
            <p className="font-semibold text-lg">Dallas North</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-red-500">
          <div>
            <p className="text-red-100 text-sm mb-1">Total Orders</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div>
            <p className="text-red-100 text-sm mb-1">In Transit</p>
            <p className="text-2xl font-bold">{stats.inTransit}</p>
          </div>
          <div>
            <p className="text-red-100 text-sm mb-1">Delivered</p>
            <p className="text-2xl font-bold">{stats.delivered}</p>
          </div>
          <div>
            <p className="text-red-100 text-sm mb-1">YTD Spending</p>
            <p className="text-2xl font-bold">${(stats.totalSpent / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <MapPin size={20} className="text-red-600" />
          ABC Supply Locations
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {abcBranches.map(branch => (
            <div key={branch.id} className="p-3 border border-slate-200 rounded-lg hover:border-red-300 transition-colors">
              <p className="font-semibold text-slate-900 text-sm mb-1">{branch.name}</p>
              <p className="text-xs text-slate-600 mb-1">{branch.address}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <Phone size={12} />
                {branch.phone}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by PO number, job, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option>All</option>
          <option>Pending</option>
          <option>Ordered</option>
          <option>In Transit</option>
          <option>Delivered</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">PO Number</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Job</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Branch</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Delivery</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{order.poNumber}</p>
                    {order.trackingNumber && (
                      <p className="text-xs text-slate-500">Track: {order.trackingNumber}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-700">{order.leadName}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-700 text-sm">{order.branchLocation?.replace('ABC Supply - ', '')}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar size={16} className="text-slate-400" />
                    {new Date(order.deliveryDate).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-semibold text-slate-900">${order.totalCost.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-red-600 to-red-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{selectedOrder.poNumber}</h2>
                  <p className="text-red-100">ABC Supply Purchase Order</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-white hover:bg-red-800 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Name</label>
                  <p className="text-slate-900 font-medium mt-1">{selectedOrder.leadName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ABC Branch</label>
                  <p className="text-slate-900 font-medium mt-1">{selectedOrder.branchLocation}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[selectedOrder.status]}`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Date</label>
                  <p className="text-slate-900 font-medium mt-1">
                    {new Date(selectedOrder.deliveryDate).toLocaleDateString()}
                  </p>
                </div>
                {selectedOrder.trackingNumber && (
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracking Number</label>
                    <p className="text-slate-900 font-medium mt-1 font-mono">{selectedOrder.trackingNumber}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Package size={18} className="text-red-600" />
                  Order Items
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {item.sku && <p className="text-xs text-slate-500 font-mono">SKU: {item.sku}</p>}
                          <p className="text-sm text-slate-600">{item.quantity} {item.unit} × ${item.unitPrice}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900 text-lg">${(item.quantity * item.unitPrice).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-slate-900">Total Cost</span>
                  <span className="text-3xl font-bold text-red-600">${selectedOrder.totalCost.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="text-xs font-semibold text-blue-900 uppercase tracking-wider block mb-2">Delivery Notes</label>
                  <p className="text-slate-700">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button className="flex-1 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-slate-700">
                  Download PDF
                </button>
                <button className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2">
                  <ExternalLink size={18} />
                  Track on ABC Supply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialOrders;
