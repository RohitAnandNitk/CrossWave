import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaTruck,
  FaCreditCard,
  FaUser,
  FaShippingFast,
  FaFileInvoice,
  FaLock,
} from "react-icons/fa";

import axios from "axios";
import { productAPI } from "../api/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { toast } from "sonner";

const BuyNow = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(null);

  const { selectedPricing } = location.state;
  const dealDetails = location.state?.dealDetails;
  const isNegotiatedDeal = !!dealDetails;
  const [formData, setFormData] = useState({
    companyName: "",
    gstin: "",
    businessType: "manufacturer",
    contactName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    deliveryType: "standard",
    specialInstructions: "",
    paymentMethod: "bank_transfer",
    currency: "INR",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (dealDetails) {
          setProduct({
            _id: dealDetails.productId,
            name: dealDetails.productName,
            price: dealDetails.finalPrice,
            quantity: dealDetails.finalQuantity,
            totalAmount: dealDetails.finalPrice * dealDetails.finalQuantity,
            image: dealDetails.productImage || "", // Add default image if needed
            seller_id: dealDetails.sellerId,
          });
          setLoading(false);
          return;
        }
        const { data } = await productAPI.getProductById(id);
        setProduct(data);

      } catch (error) {
        console.error("Error fetching product:", error);
        navigate("/products"); // Redirect on error
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, dealDetails]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    setAmount(calculateTotal());
  }, [formData, product, dealDetails]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    console.log(product);

    try {
      // const verifyBuyer
      console.log(user);
      if (!user.is_kyc_done || !user.is_company_docs_done) {
        return toast.error(
          "Please complete KYC and upload all the documents before proceeding",
          { duration: 5000 }
        );
      }
      const { data } = await axios.post(
        "http://localhost:3000/payment/create-payment",
        { amount }
      );
      console.log("Payment request response:", data);

      if (data.id) {
        navigate("/pay-now", {
          state: {
            order_id: data.id,
            amount,
            currency: data.currency,
            product,
            product_id: product._id,
            seller_id: product.seller_id,
            formData,
            price: isNegotiatedDeal
              ? dealDetails.finalPrice
              : product.pricing[selectedPricing].price,
            quantity: isNegotiatedDeal
              ? dealDetails.finalQuantity
              : product.pricing[selectedPricing].moq,
            dealDetails,
          },
        });
      } else {
        console.error("Payment request did not return an ID.");
      }
    } catch (e) {
      console.error("Error during payment request:", e);
    }
  };
  
   
  const calculateSubtotal = () => {
    if (isNegotiatedDeal) {
      const basePrice = dealDetails.finalPrice;
      const quantity = dealDetails.finalQuantity;
      return (basePrice * quantity).toFixed(2);
    }
    if (!product?.pricing?.[selectedPricing]) return 0;

    const price = product.pricing[selectedPricing].price;
    // Check if price is already a number
    const priceValue =
      typeof price === "number"
        ? price
        : parseFloat(price.replace(/[^0-9.]/g, ""));
    const quantity = parseInt(product.pricing[selectedPricing].moq);
    return (priceValue * quantity).toFixed(2);
  };

  const calculatePlatformFee = () => {
    // Platform fee is 20 per unit
    if (isNegotiatedDeal) {
      return (0.1 * dealDetails.finalQuantity * dealDetails.finalPrice).toFixed(
        2
      );
    }
    return 0;
  };

  const calculateShipping = () => {
    const subtotal = parseFloat(calculateSubtotal());

    switch (formData.deliveryType) {
      case "express":
        return (subtotal * 0.1).toFixed(2);
      case "priority":
        return (subtotal * 0.15).toFixed(2);
      default:
        return (subtotal * 0.05).toFixed(2);
    }
  };

  const calculateTax = () => {
    const subtotal = parseFloat(calculateSubtotal());
    return (subtotal * 0.18).toFixed(2);
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(calculateSubtotal());
    const shipping = parseFloat(calculateShipping());
    const tax = parseFloat(calculateTax());
    const total = (subtotal + shipping + tax).toFixed(2);
    return total;
  };

  const renderNegotiatedDetails = () => (
    <div className="bg-green-50 p-6 rounded-xl border border-green-100 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FaLock className="text-green-600" />
        <h3 className="text-lg font-semibold text-green-800">
          Negotiated Deal Details
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-green-600">Price per unit (Locked)</p>
          <p className="text-xl font-semibold text-green-700">
            ₹{dealDetails?.finalPrice}
          </p>
        </div>
        <div>
          <p className="text-sm text-green-600">Quantity (Locked)</p>
          <p className="text-xl font-semibold text-green-700">
            {dealDetails?.finalQuantity} units
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-green-600">Total Value</p>
          <p className="text-xl font-semibold text-green-700">
            ₹{(dealDetails?.finalPrice * dealDetails?.finalQuantity).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );

  const formSections = [
    // {
    //   id: "company",
    //   title: "Company Information",
    //   icon: <FaBuilding className="text-blue-500" />,
    //   description: "Enter your business details for billing and compliance",
    // },
    {
      id: "contact",
      title: "Contact Information",
      icon: <FaUser className="text-green-500" />,
      description: "How can we reach you regarding this order?",
    },
    {
      id: "shipping",
      title: "Shipping Information",
      icon: <FaShippingFast className="text-purple-500" />,
      description: "Where should we deliver your order?",
    },
    {
      id: "delivery",
      title: "Delivery Preferences",
      icon: <FaTruck className="text-orange-500" />,
      description: "Choose how you want your order delivered",
    },
  ];

  if (loading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="ml-4">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-24 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="fixed inset-0 z-0">
        {/* Circuit Pattern */}
        <div
          className="absolute inset-0 bg-repeat opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10h80v80h-80z' fill='none' stroke='%234B5563' stroke-width='1'/%3E%3Cpath d='M30 30h40v40h-40z' fill='none' stroke='%234B5563' stroke-width='1'/%3E%3Cpath d='M20 10v80M40 10v80M60 10v80M80 10v80' stroke='%234B5563' stroke-width='0.5'/%3E%3Cpath d='M10 20h80M10 40h80M10 60h80M10 80h80' stroke='%234B5563' stroke-width='0.5'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Animated Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Breadcrumb */}
        <motion.nav
          className="mb-8 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between items-center">
            <Link
              to={`/product/${id}`}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <FaArrowLeft className="mr-2" /> Back to Product
            </Link>
            <div className="text-sm text-gray-500">Step: Order Details</div>
          </div>
        </motion.nav>

        {/* Progress Steps */}
        <motion.div
          className="mb-12 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between">
            {["Order Details", "Shipping", "Payment", "Confirmation"].map(
              (step, index) => (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? "bg-blue-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="text-sm mt-2">{step}</div>
                </div>
              )
            )}
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Form Sections */}
          <motion.div
            className="lg:col-span-2 space-y-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Enhanced Order Summary */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <FaFileInvoice className="text-2xl text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold">Order Summary</h2>
                  <p className="text-gray-600">Review your order details</p>
                </div>
              </div>
              <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  {/* <p className="text-gray-600">
                    {product.specifications.technical.size}
                  </p> */}
                  <div className="mt-2 text-sm text-gray-500">
                    Quantity:{" "}
                    {isNegotiatedDeal
                      ? dealDetails.finalQuantity
                      : product.pricing[selectedPricing].moq}{" "}
                    units
                  </div>
                  <div className="text-blue-600 font-semibold">
                    {isNegotiatedDeal
                      ? dealDetails.finalPrice
                      : product.pricing[selectedPricing].price}{" "}
                    per unit
                  </div>
                </div>
              </div>
            </div>

            {isNegotiatedDeal && renderNegotiatedDetails()}

            {/* Form Sections with Enhanced Design */}
            {formSections.map((section) => (
              <motion.div
                key={section.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-2xl">{section.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold">{section.title}</h3>
                    <p className="text-gray-600">{section.description}</p>
                  </div>
                </div>
                {/* Render form fields based on section.id */}

                {section.id === "contact" && (
                  <div className="grid gap-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Name *
                        </label>
                        <input
                          type="text"
                          name="contactName"
                          value={formData.contactName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
                {section.id === "shipping" && (
                  <div className="grid gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PIN Code *
                        </label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country *
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="India">India</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {section.id === "delivery" && (
                  <div className="grid gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Type
                      </label>
                      <select
                        name="deliveryType"
                        value={formData.deliveryType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="standard">Standard Delivery</option>
                        <option value="express">Express Delivery</option>
                        <option value="priority">Priority Delivery</option>
                      </select>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{section.title}</h3>
                      <p className="text-gray-600">{section.description}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Right Column - Enhanced Order Summary */}
          <motion.div
            className="lg:col-span-1 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="sticky top-24 space-y-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <FaCreditCard className="text-blue-600" />
                  Payment Details
                </h3>
                {/* Enhanced Price Breakdown */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base Price</span>
                    <span className="font-medium">
                      ₹
                      {isNegotiatedDeal
                        ? calculateSubtotal() /
                          product.pricing[selectedPricing].moq
                        : product.pricing[selectedPricing].price}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Subtotal (
                      {isNegotiatedDeal
                        ? dealDetails.finalQuantity
                        : product.pricing[selectedPricing].moq}{" "}
                      units)
                    </span>
                    <span className="font-medium">
                      ₹
                      {isNegotiatedDeal
                        ? calculateSubtotal()
                        : product.pricing[selectedPricing].moq *
                          product.pricing[selectedPricing].price}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-medium">
                      ₹
                      {isNegotiatedDeal
                        ? dealDetails.finalQuantity * 20
                        : product.pricing[selectedPricing].moq * 20}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Custom Duty</span>
                    <span className="font-medium">
                      ₹
                      {isNegotiatedDeal
                        ? calculateSubtotal() * 0.05
                        : product.pricing[selectedPricing].moq *
                          product.pricing[selectedPricing].price *
                          0.05}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">insurance</span>
                    <span className="font-medium">
                      ₹
                      {isNegotiatedDeal
                        ? calculateSubtotal() * 0.03
                        : product.pricing[selectedPricing].moq *
                          product.pricing[selectedPricing].price *
                          0.03}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST(5%)</span>
                    <span className="font-medium">
                      ₹{" "}
                      {isNegotiatedDeal
                        ? calculateSubtotal() * 0.05
                        : product.pricing[selectedPricing].moq *
                          product.pricing[selectedPricing].price *
                          0.05}
                    </span>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-blue-600">
                        ₹
                        {isNegotiatedDeal
                          ? calculateSubtotal() * 0.05 +
                            calculateSubtotal() * 0.03 +
                            calculateSubtotal() * 0.05 +
                            calculateSubtotal()
                          : product.pricing[selectedPricing].moq *
                              product.pricing[selectedPricing].price *
                              0.05 +
                            product.pricing[selectedPricing].moq *
                              product.pricing[selectedPricing].price *
                              0.03 +
                            product.pricing[selectedPricing].moq *
                              product.pricing[selectedPricing].price *
                              0.05 +
                            product.pricing[selectedPricing].moq *
                              product.pricing[selectedPricing].price +
                            product.pricing[selectedPricing].moq * 20}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      * All prices are inclusive of taxes and shipping
                    </p>
                  </div>
                </div>

                {/* Enhanced Payment Method Selection */}
                {/* <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <div className="space-y-2">
                    {['bank_transfer', 'letter_of_credit', 'advance_payment'].map((method) => (
                      <motion.button
                        key={method}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-4 rounded-lg border ${
                          formData.paymentMethod === method
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        } flex items-center gap-3`}
                        onClick={() => handleInputChange({
                          target: { name: 'paymentMethod', value: method }
                        })}
                      >
                        <FaCreditCard className={
                          formData.paymentMethod === method
                            ? 'text-blue-500'
                            : 'text-gray-400'
                        } />
                        <span className="capitalize">{method.replace(/_/g, ' ')}</span>
                      </motion.button>
                    ))}
                  </div>
                </div> */}

                {/* Place Order Button */}
                <motion.button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold mt-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Place Order
                </motion.button>
              </div>
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default BuyNow;
