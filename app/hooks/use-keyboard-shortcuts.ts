import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

const shortcuts: KeyboardShortcut[] = [
  {
    key: 'd',
    alt: true,
    shift: true,
    description: 'Ir al Dashboard',
    action: () => {}
  },
  {
    key: 'c',
    alt: true,
    shift: true,
    description: 'Ir a Clientes',
    action: () => {}
  },
  {
    key: 'p',
    alt: true,
    shift: true,
    description: 'Ir a Pagos',
    action: () => {}
  },
  {
    key: 'r',
    alt: true,
    shift: true,
    description: 'Ir a Reportes',
    action: () => {}
  },
  {
    key: '?',
    shift: true,
    description: 'Mostrar ayuda de atajos',
    action: () => {}
  }
];

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si está escribiendo en un input o elemento editable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Navegación con Alt + Shift (evita colisiones con Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Ctrl+P, Ctrl+R, etc.)
      if (e.altKey && e.shiftKey) {
        // Alt + Shift + D: Dashboard
        if (key === 'd') {
          e.preventDefault();
          router.push('/dashboard');
        }

        // Alt + Shift + C: Clientes
        if (key === 'c') {
          e.preventDefault();
          router.push('/dashboard/clientes');
        }

        // Alt + Shift + P: Pagos
        if (key === 'p') {
          e.preventDefault();
          router.push('/dashboard/pagos');
        }

        // Alt + Shift + R: Reportes
        if (key === 'r') {
          e.preventDefault();
          router.push('/dashboard/reportes');
        }
      }

      // Shift + ?: Ayuda
      if (e.shiftKey && (e.key === '?' || e.key === '/') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        mostrarAyuda();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const mostrarAyuda = () => {
    const mensaje = `
🔥 Atajos de Teclado:

Ctrl + K: Búsqueda global
Alt + Shift + D: Dashboard
Alt + Shift + C: Clientes
Alt + Shift + P: Pagos
Alt + Shift + R: Reportes
Shift + ?: Esta ayuda
    `;
    toast(mensaje, { duration: 5000 });
  };

  return { mostrarAyuda };
}

