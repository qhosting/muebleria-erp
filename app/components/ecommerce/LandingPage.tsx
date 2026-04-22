
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, CreditCard, ShieldCheck, Truck, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">DOMIAHOME</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="#productos" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Productos</Link>
              <Link href="#credito" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Crédito Directo</Link>
              <Link href="#nosotros" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Nosotros</Link>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-600">Acceso Personal</Button>
              </Link>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                Ver Catálogo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/furniture_ecommerce_hero.png" // We'll need to move the generated image to public
            alt="Muebles de Lujo DomiaHome"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-6">
              <Star className="w-4 h-4 fill-blue-600" />
              <span>Nuevos Lanzamientos 2024</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 leading-tight mb-6">
              Rediseña tu Hogar con <span className="text-blue-600">Estilo Único.</span>
            </h1>
            <p className="text-xl text-slate-700 mb-10 leading-relaxed">
              Descubre colecciones exclusivas de muebles que combinan diseño moderno, 
              confort supremo y la mejor calidad artesanal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-14 px-8 text-lg bg-slate-900 hover:bg-slate-800 text-white rounded-full">
                Explorar Colección <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 rounded-full">
                Solicitar Crédito
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Trust Bar */}
      <div className="bg-slate-50 py-12 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Truck className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Envío Gratis</h4>
                <p className="text-sm text-slate-500">En zonas locales</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <CreditCard className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Crédito Fácil</h4>
                <p className="text-sm text-slate-500">Aprobación inmediata</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <ShieldCheck className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Garantía Total</h4>
                <p className="text-sm text-slate-500">2 años de respaldo</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Star className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">4.9/5 Estrellas</h4>
                <p className="text-sm text-slate-500">Miles de clientes felices</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products Section */}
      <section id="productos" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Lo Más Vendido</h2>
            <p className="text-slate-600 text-lg">Nuestras piezas favoritas seleccionadas para ti.</p>
          </div>
          <Button variant="link" className="text-blue-600 font-bold text-lg">Ver Todo →</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { name: 'Sofá Minimalista Gray', price: '$12,499', cat: 'Salas', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600' },
            { name: 'Mesa Comedor Nórdica', price: '$8,200', cat: 'Comedores', img: 'https://images.unsplash.com/photo-1577141333179-468f18a13e46?auto=format&fit=crop&q=80&w=600' },
            { name: 'Sillón Eames Classic', price: '$5,800', cat: 'Recámaras', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=600' },
            { name: 'Lámpara de Pie Arc', price: '$2,150', cat: 'Iluminación', img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=600' },
          ].map((product, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden mb-6 bg-slate-100">
                <img 
                  src={product.img} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-900">{product.cat}</span>
                </div>
                <button className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl translate-y-20 group-hover:translate-y-0 transition-all duration-300">
                  <ShoppingCart className="w-5 h-5 text-slate-900" />
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{product.name}</h3>
              <p className="text-slate-500 font-medium">{product.price}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Credit Section */}
      <section id="credito" className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <ShoppingCart className="w-full h-full -rotate-12" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-8">Amuebla Hoy, <br /><span className="text-blue-400">Paga Después.</span></h2>
              <p className="text-xl text-slate-300 mb-12">
                Con nuestro crédito directo, no necesitas tarjetas bancarias. 
                Aprobamos tu solicitud en menos de 24 horas para que disfrutes tu hogar ahora mismo.
              </p>
              <ul className="space-y-4 mb-12">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span>Pagos semanales o quincenales</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span>Sin penalización por liquidación anticipada</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span>Requisitos mínimos: INE y comprobante</span>
                </li>
              </ul>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-10 text-lg">
                Solicitar Crédito Ahora
              </Button>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Calculadora de Pagos</h3>
                    <p className="text-slate-400 text-sm">Estimación rápida</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Monto de la compra</label>
                    <div className="text-3xl font-bold">$10,000 MXN</div>
                  </div>
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pago Semanal</p>
                      <p className="text-2xl font-bold text-blue-400">$250</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Plazo</p>
                      <p className="text-2xl font-bold">48 semanas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-20 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">D</span>
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">DOMIAHOME</span>
              </div>
              <p className="text-slate-500 max-w-sm leading-relaxed">
                Transformando hogares con elegancia y accesibilidad desde hace más de 15 años. 
                Calidad garantizada y crédito directo para todas las familias.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Enlaces Rápidos</h4>
              <ul className="space-y-4 text-slate-600">
                <li><Link href="#productos" className="hover:text-blue-600 transition-colors">Ver Productos</Link></li>
                <li><Link href="#credito" className="hover:text-blue-600 transition-colors">Solicitar Crédito</Link></li>
                <li><Link href="/login" className="hover:text-blue-600 transition-colors">Portal Empleados</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Contacto</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li>📍 Av. Principal #123, Col. Centro</li>
                <li>📞 800-MUEBLES (683-2537)</li>
                <li>✉️ hola@domiahome.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t text-center text-slate-400 text-sm">
            <p>&copy; 2024 DOMIAHOME. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
