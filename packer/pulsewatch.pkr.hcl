packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  default = "ap-southeast-1"
}

source "amazon-ebs" "pulsewatch" {
  region        = var.aws_region
  instance_type = "t3.micro"
  ssh_username  = "ec2-user"
  ami_name      = "pulsewatch-app-{{timestamp}}"

  source_ami_filter {
    filters = {
      name                = "al2023-ami-*-x86_64"
      virtualization-type = "hvm"
      root-device-type    = "ebs"
    }
    owners      = ["amazon"]
    most_recent = true
  }

  tags = {
    Name        = "pulsewatch-app"
    pulsewatch  = "true"
  }
}

build {
  sources = ["source.amazon-ebs.pulsewatch"]

  # Install Node.js 20
  provisioner "shell" {
    inline = [
      "sudo curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -",
      "sudo dnf install -y nodejs"
    ]
  }

  # Copy the backend app code onto the instance
  provisioner "file" {
    source      = "../app/index.js"
    destination = "/tmp/index.js"
  }

  provisioner "file" {
    source      = "../app/package.json"
    destination = "/tmp/package.json"
  }

  provisioner "file" {
    source      = "../app/pulsewatch.service"
    destination = "/tmp/pulsewatch.service"
  }

  provisioner "file" {
    source      = "../app/frontend"
    destination = "/tmp/frontend"
  }

  # Install backend into /opt/app and install deps
  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/app",
      "sudo mv /tmp/index.js /opt/app/index.js",
      "sudo mv /tmp/package.json /opt/app/package.json",
      "cd /opt/app && sudo npm install --production"
    ]
  }

  # Build the React frontend (separate provisioner so build failure stops the AMI build)
  provisioner "shell" {
    inline = [
      "sudo mv /tmp/frontend /opt/app/frontend",
      "cd /opt/app/frontend && sudo npm install && sudo npm run build",
      "# Clean up frontend source (only dist/ is needed at runtime)",
      "sudo rm -rf /opt/app/frontend/node_modules /opt/app/frontend/src /opt/app/frontend/package.json /opt/app/frontend/package-lock.json /opt/app/frontend/vite.config.js /opt/app/frontend/index.html"
    ]
  }

  # Register systemd service
  provisioner "shell" {
    inline = [
      "sudo mv /tmp/pulsewatch.service /etc/systemd/system/pulsewatch.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable pulsewatch"
    ]
  }
}
